import { prisma } from "./prisma.js";

/** Rename legacy demo logins if the DB was seeded before @imperial.local → @imperial. */
const EMAIL_RENAMES: Array<[from: string, to: string]> = [
  ["md@imperial.local", "md@imperial"],
  ["associate@imperial.local", "associate@imperial"],
  ["assoc@imperial.local", "assoc@imperial"],
];

export async function migrateDemoEmails() {
  let changed = 0;
  for (const [from, to] of EMAIL_RENAMES) {
    const legacy = await prisma.user.findUnique({ where: { email: from } });
    if (!legacy) continue;

    const taken = await prisma.user.findUnique({ where: { email: to } });
    if (taken) {
      // Free the legacy address; keep the row that already has the new email.
      await prisma.user.update({
        where: { id: legacy.id },
        data: { email: `retired.${Date.now()}.${from}` },
      });
      changed += 1;
      console.log(`Retired duplicate demo email ${from} (kept ${to})`);
      continue;
    }

    await prisma.user.update({
      where: { id: legacy.id },
      data: { email: to },
    });
    changed += 1;
    console.log(`Migrated demo email ${from} → ${to}`);
  }
  if (changed === 0) {
    console.log("Demo email migration: no legacy @imperial.local accounts found");
  }
}
