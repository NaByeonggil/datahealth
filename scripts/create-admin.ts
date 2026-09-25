/**
 * 첫 관리자 계정 만들기 — npm run create-admin
 *
 * 로그인을 붙이고 나면 계정이 하나도 없어 아무도 들어갈 수 없다.
 * 이 스크립트로 첫 관리자를 만들고, 나머지 계정은 화면에서 추가한다.
 *
 * 사용: npm run create-admin -- <아이디> <이름> [비밀번호]
 *       비밀번호를 생략하면 임의로 만들어 화면에 한 번만 보여준다.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword, validatePassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const [username, name, passwordArg] = process.argv.slice(2);

  if (!username || !name) {
    console.error("사용법: npm run create-admin -- <아이디> <이름> [비밀번호]");
    process.exit(1);
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    console.error("아이디는 영문 소문자·숫자·._- 로 3~30자여야 합니다.");
    process.exit(1);
  }

  // 비밀번호를 안 주면 만들어 준다 (한 번만 출력된다)
  const generated = !passwordArg;
  const password = passwordArg || randomBytes(9).toString("base64url");

  const invalid = validatePassword(password);
  if (invalid) {
    console.error(invalid);
    process.exit(1);
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    console.error(`이미 있는 아이디입니다: ${username}`);
    process.exit(1);
  }

  const user = await prisma.user.create({
    data: {
      username,
      name,
      role: "admin",
      passwordHash: await hashPassword(password),
      // 직접 정한 비밀번호면 그대로 쓰고, 생성된 것이면 첫 로그인에서 바꾸게 한다
      mustChangePassword: generated,
    },
  });

  console.log("\n관리자 계정을 만들었습니다.");
  console.log(`  아이디  ${user.username}`);
  console.log(`  이름    ${user.name}`);
  if (generated) {
    console.log(`  비밀번호 ${password}   ← 지금 적어두세요. 다시 보여주지 않습니다.`);
    console.log("  (첫 로그인에서 새 비밀번호를 정하게 됩니다)");
  }
  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
