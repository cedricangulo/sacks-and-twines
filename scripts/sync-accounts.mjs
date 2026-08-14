import { spawn } from "node:child_process"
import { stdin as input, stdout as output } from "node:process"
import readline from "node:readline/promises"

const rl = readline.createInterface({ input, output })

const answer = await rl.question(
  "syncAccounts will DELETE all accounts and CLEAR the database, then recreate seeded accounts from env. Proceed? (y/N) "
)
rl.close()

if (!/^y(?:es)?$/i.test(answer.trim())) {
  console.log("Aborted.")
  process.exit(0)
}

const child = spawn(
  "pnpm",
  ["exec", "convex", "run", "init:syncAccounts", '{"confirm":true}'],
  { stdio: "inherit", shell: process.platform === "win32" }
)

child.on("error", (err) => {
  console.error("Failed to run syncAccounts:", err.message)
  process.exit(1)
})
child.on("exit", (code) => process.exit(code ?? 0))
