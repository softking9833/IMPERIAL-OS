import { prisma } from "./prisma.js";

/** Rename legacy demo logins if the DB was seeded before @imperial.local → @imperial. */
const EMAIL_RENAMES: Array<[from: string, to: string]> = [
  ["md@imperial.local", "md@imperial"],
  ["associate@imperial.local", "associate@imperial"],
  ["assoc@imperial.local", "assoc@imperial"],
];

export async function migrateDemoEmails() {
  for (const [from, to] of EMAIL_RENAMES) {
    const legacy = await prisma.user.findUnique({ where: { email: from } });
    if (!legacy) continue;

    const taken = await prisma.user.findUnique({ where: { email: to } });
    if (taken) {
      // Prefer the new address; drop the legacy duplicate row carefully via email free-up.
      await prisma.user.update({
        where: { id: legacy.id },
        data: { email: `${from}.migrated-${Date.now()}` },
      });
      continue;
    }

    await prisma.user.update({
      where: { id: legacy.id },
      data: { email: to },
    });
    console.log(`Migrated demo email ${from} → ${to}`);
  }
}
