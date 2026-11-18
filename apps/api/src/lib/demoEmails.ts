import { prisma } from "./prisma.js";

/** Rename legacy demo logins to @imperial.com (valid email TLD for Zod). */
const EMAIL_RENAMES: Array<[from: string, to: string]> = [
  ["md@imperial.local", "md@imperial.com"],
  ["associate@imperial.local", "associate@imperial.com"],
  ["assoc@imperial.local", "assoc@imperial.com"],
  ["md@imperial", "md@imperial.com"],
  ["associate@imperial", "associate@imperial.com"],
  ["assoc@imperial", "assoc@imperial.com"],
];

export async function migrateDemoEmails() {
  let changed = 0;
  for (const [from, to] of EMAIL_RENAMES) {
    const legacy = await prisma.user.findUnique({ where: { email: from } });
    if (!legacy) continue;

    const taken = await prisma.user.findUnique({ where: { email: to } });
    if (taken) {
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
    console.log("Demo email migration: no legacy accounts found");
  }
}
