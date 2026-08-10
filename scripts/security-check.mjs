import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function walk(dir) {
  const out=[];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const required=[
  ["next.config.ts","poweredByHeader: false"],
  ["src/proxy.ts","Content-Security-Policy"],
  ["src/proxy.ts","Strict-Transport-Security"],
  ["src/lib/security.ts","assertCsrf"],
  ["src/lib/session.ts","organizationId"],
  ["src/app/api/employees/route.ts","organization_id=$1"],
  ["src/app/api/auth/login/route.ts","argon2.verify"],
  ["src/app/api/auth/login/route.ts","httpOnly:true"],
  ["src/lib/rate-limit.ts","MAX_ATTEMPTS"],
  ["src/lib/audit.ts","INSERT INTO audit_logs"]
];

let ok=true;
for(const [file,needle] of required){
  const text=await readFile(file,"utf8");
  const pass=text.includes(needle);
  console.log(`${pass?"✓":"✗"} ${file}: ${needle}`);
  if(!pass) ok=false;
}

const sourceFiles=(await walk("src")).filter(f=>/\.(ts|tsx)$/.test(f));
const forbidden=["dangerouslySetInnerHTML","eval(","new Function(","'unsafe-inline'",'"unsafe-inline"'];
for(const file of sourceFiles){
  const text=await readFile(file,"utf8");
  for(const needle of forbidden){
    if(text.includes(needle)){
      console.log(`✗ forbidden pattern ${needle} in ${file}`);
      ok=false;
    }
  }
}

const mutationRoutes=[
  "src/app/api/auth/logout/route.ts",
  "src/app/api/employees/route.ts",
  "src/app/api/employees/[id]/route.ts",
  "src/app/api/leave/route.ts",
  "src/app/api/employees/import/route.ts"
];
for(const file of mutationRoutes){
  const text=await readFile(file,"utf8");
  const hasMutation=/export async function (POST|PUT|PATCH|DELETE)/.test(text);
  const csrf=text.includes("assertCsrf") || file.includes("auth/login");
  if(hasMutation && !csrf){console.log(`✗ mutation route missing CSRF guard: ${file}`);ok=false;}
}

if(!ok) process.exit(1);
console.log("Security baseline checks passed.");
