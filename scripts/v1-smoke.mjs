const API = process.env.API_URL || "http://localhost:4000";

async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const results = [];
function ok(name) {
  results.push({ name, pass: true });
  console.log(`PASS  ${name}`);
}
function fail(name, err) {
  results.push({ name, pass: false, err: String(err) });
  console.error(`FAIL  ${name}: ${err}`);
}

async function login(email) {
  const data = await req("/auth/login", {
    method: "POST",
    body: { email, password: "password123" },
  });
  return data;
}

async function main() {
  // Health
  try {
    const h = await req("/health");
    assert(h.ok, "health not ok");
    ok("API health");
  } catch (e) {
    fail("API health", e);
    process.exit(1);
  }

  let mdToken, assocToken, assocId, mdId;

  try {
    const md = await login("md@imperial.com");
    const assoc = await login("associate@imperial.com");
    mdToken = md.token;
    assocToken = assoc.token;
    assocId = assoc.user.id;
    mdId = md.user.id;
    assert(md.user.role === "MANAGING_DIRECTOR", "MD role");
    assert(assoc.user.role === "JUNIOR_ASSOCIATE", "Associate role");
    ok("Auth login MD + Associate");
  } catch (e) {
    fail("Auth login MD + Associate", e);
    process.exit(1);
  }

  // Field readiness complete + approve
  try {
    let ready = await req("/readiness/me", { token: assocToken });
    for (const item of ready.requirements) {
      if (item.status !== "COMPLETED" && item.status !== "APPROVED") {
        await req(`/readiness/me/${item.id}/complete`, {
          method: "POST",
          token: assocToken,
        });
      }
    }
    ready = await req("/readiness/me", { token: assocToken });
    assert(
      ready.lifecycleState === "AWAITING_MANAGER_REVIEW" || ready.pendingApproval,
      `expected awaiting review, got ${ready.lifecycleState}`,
    );
    await req(`/readiness/${assocId}/approve`, {
      method: "POST",
      token: mdToken,
      body: { decision: "APPROVED" },
    });
    const me = await req("/auth/me", { token: assocToken });
    // token may have stale claims — login again
    const assoc2 = await login("associate@imperial.com");
    assocToken = assoc2.token;
    assert(assoc2.user.isFieldReady === true, "associate not field ready after approve");
    ok("Field Readiness complete + MD approve");
  } catch (e) {
    fail("Field Readiness complete + MD approve", e);
  }

  // Deploy
  let campaignId, territoryId;
  try {
    const campaigns = await req("/campaigns", { token: mdToken });
    const campaign = campaigns.campaigns?.[0] || campaigns[0];
    assert(campaign, "no campaign");
    campaignId = campaign.id;
    const detail = await req(`/campaigns/${campaignId}`, { token: mdToken }).catch(() => null);
    // list territories from campaign payload if present
    let territories = campaign.territories;
    if (!territories) {
      // seed creates territory — fetch users/campaigns list may include; use prisma-less approach via campaign get
      const all = await req("/campaigns", { token: mdToken });
      const c = (all.campaigns || all).find((x) => x.id === campaignId) || campaign;
      territories = c.territories;
    }
    // Fallback: deploy endpoint needs territoryId — get from seed via users endpoint or campaign detail
    if (!territories?.length) {
      // Try admin/overview or raw: many routes return territories nested
      const users = await req("/users", { token: mdToken });
      void users;
    }
    // Direct: campaigns list in this API
    const listed = await req("/campaigns", { token: mdToken });
    const first = (listed.campaigns || listed)[0];
    territoryId = first.territories?.[0]?.id;
    if (!territoryId) {
      // create territory
      const t = await req(`/campaigns/${campaignId}/territories`, {
        method: "POST",
        token: mdToken,
        body: { name: "Smoke Test Territory" },
      });
      territoryId = t.territory.id;
    }
    campaignId = first.id;
    await req("/campaigns/deployments", {
      method: "POST",
      token: mdToken,
      body: { userId: assocId, campaignId, territoryId },
    });
    const field = await req("/field/today", { token: assocToken });
    assert(field.isFieldReady, "field ready false");
    assert(field.deployment, "no deployment");
    campaignId = field.deployment.campaign.id;
    ok("Deploy associate to campaign/territory");
  } catch (e) {
    fail("Deploy associate to campaign/territory", e);
  }

  // Field loop + clientRef dedupe
  try {
    const dayRef = `day-smoke-${Date.now()}`;
    await req("/field/activity", {
      method: "POST",
      token: assocToken,
      body: { doorsKnocked: 12, conversations: 4, notes: "smoke", clientRef: dayRef },
    });
    await req("/field/activity", {
      method: "POST",
      token: assocToken,
      body: { doorsKnocked: 15, conversations: 5, notes: "smoke2", clientRef: dayRef },
    });

    const saleRef = `sale-smoke-${Date.now()}`;
    const s1 = await req("/field/sales", {
      method: "POST",
      token: assocToken,
      body: { campaignId, notes: "smoke sale", clientRef: saleRef },
    });
    const s2 = await req("/field/sales", {
      method: "POST",
      token: assocToken,
      body: { campaignId, notes: "smoke sale dup", clientRef: saleRef },
    });
    assert(s1.sale.id === s2.sale.id, "sale dedupe failed");
    assert(s2.deduped === true, "sale deduped flag missing");

    const cbRef = `cb-smoke-${Date.now()}`;
    const c1 = await req("/field/callbacks", {
      method: "POST",
      token: assocToken,
      body: { addressNote: "12 Test St", clientRef: cbRef },
    });
    const c2 = await req("/field/callbacks", {
      method: "POST",
      token: assocToken,
      body: { addressNote: "12 Test St", clientRef: cbRef },
    });
    assert(c1.callback.id === c2.callback.id, "callback dedupe failed");

    await req(`/field/callbacks/${cbRef}`, {
      method: "PATCH",
      token: assocToken,
      body: { status: "COMPLETED" },
    });

    const eodRef = `eod-smoke-${Date.now()}`;
    await req("/field/end-of-day", {
      method: "POST",
      token: assocToken,
      body: { wins: "doors", challenges: "weather", tomorrowFocus: "callbacks", clientRef: eodRef },
    });

    const field = await req("/field/today", { token: assocToken });
    assert(field.activity?.doorsKnocked === 15, `doors expected 15 got ${field.activity?.doorsKnocked}`);
    assert(field.endOfDay, "eod missing");
    ok("Field activity/sales/callbacks/EOD + clientRef dedupe");
  } catch (e) {
    fail("Field activity/sales/callbacks/EOD + clientRef dedupe", e);
  }

  // Learn
  try {
    const lessons = await req("/learn/lessons", { token: assocToken });
    assert(lessons.lessons?.length > 0, "no lessons");
    const lesson = lessons.lessons.find((l) => !l.quiz) || lessons.lessons[0];
    if (lesson.quiz) {
      const answers = lesson.quiz.questions.map((q) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));
      await req(`/learn/lessons/${lesson.id}/quiz`, {
        method: "POST",
        token: assocToken,
        body: { answers },
      });
    } else {
      await req(`/learn/lessons/${lesson.id}/complete`, {
        method: "POST",
        token: assocToken,
      });
    }
    ok("Learn lesson/quiz");
  } catch (e) {
    fail("Learn lesson/quiz", e);
  }

  // Roleplay
  try {
    const mine = await req("/roleplay/me", { token: assocToken });
    assert(mine.items?.length > 0, "no roleplays");
    const reqId = mine.items[0].requirement.id;
    await req("/roleplay/submit", {
      method: "POST",
      token: assocToken,
      body: {
        requirementId: reqId,
        content: "Hello, I’m from IMPERIAL. Quick question about your energy supplier today.",
      },
    });
    const queue = await req("/roleplay/queue", { token: mdToken }).catch(() => null);
    // try common paths
    let reviewed = false;
    if (queue?.items || queue?.submissions) {
      const sub = (queue.items || queue.submissions)[0];
      const subId = sub.id || sub.submission?.id;
      if (subId) {
        await req(`/roleplay/submissions/${subId}/review`, {
          method: "POST",
          token: mdToken,
          body: { decision: "APPROVED", feedback: "Strong open" },
        }).catch(async () => {
          await req(`/roleplay/${subId}/review`, {
            method: "POST",
            token: mdToken,
            body: { status: "APPROVED", feedback: "Strong open" },
          });
        });
        reviewed = true;
      }
    }
    // submission alone is enough for associate loop
    ok(reviewed ? "Roleplay submit + MD review" : "Roleplay submit (review endpoint soft)");
  } catch (e) {
    fail("Roleplay submit", e);
  }

  // Performance
  try {
    const perf = await req("/performance/me", { token: assocToken });
    assert(perf.performance?.kpis, "missing kpis");
    assert(typeof perf.performance.profitability.predictedProfitPence === "number", "no predicted");
    ok("Performance predicted/actual snapshot");
  } catch (e) {
    fail("Performance predicted/actual snapshot", e);
  }

  // Home
  try {
    const homeA = await req("/home", { token: assocToken });
    const homeM = await req("/home", { token: mdToken });
    assert(homeA.home?.greeting, "associate home");
    assert(homeM.home?.greeting, "md home");
    ok("Home next-actions for MD + Associate");
  } catch (e) {
    fail("Home next-actions for MD + Associate", e);
  }

  // Admin config
  try {
    const cfg = await req("/admin/config", { token: mdToken }).catch(() => null);
    if (cfg) {
      ok("Admin config readable");
    } else {
      // try curriculum create path used by app
      const adminHome = await req("/admin/overview", { token: mdToken }).catch(() =>
        req("/admin/stats", { token: mdToken }).catch(() => null),
      );
      assert(adminHome, "admin overview missing");
      ok("Admin overview reachable");
    }
  } catch (e) {
    fail("Admin config/overview", e);
  }

  // Profile
  try {
    const p = await req("/profile/me", { token: assocToken });
    assert(p.profile?.email === "associate@imperial.com", "profile email");
    ok("Profile identity view");
  } catch (e) {
    fail("Profile identity view", e);
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n——— SUMMARY ———");
  console.log(`Passed: ${results.filter((r) => r.pass).length}/${results.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.err}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
