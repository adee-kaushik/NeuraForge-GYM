const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the actual TypeScript server modules against explicit service doubles.
function load(file, mocks = {}) {
  const cache = new Map();
  function read(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const req = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/')) return read(path.resolve('src', id.slice(2) + '.ts'));
      if (id.startsWith('.')) return read(path.resolve(path.dirname(filename), id + '.ts'));
      return require(id);
    };
    new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
    return mod.exports;
  }
  return read(path.resolve(file));
}
const inert = {
  'next/navigation': { redirect() { throw new Error('redirect'); } },
  '@/utils/supabase/server': {}, '@/utils/supabase/admin': {},
  '@/lib/auth': {}, '@/lib/member-session': {}, '@/lib/biometric': {},
};
function form(values) { const f = new FormData(); for (const [k,v] of Object.entries(values)) f.set(k,v); return f; }

test('user-controlled metadata and built-in email guesses cannot grant admin access', () => {
  const old = process.env.ADMIN_EMAILS; delete process.env.ADMIN_EMAILS;
  try {
    const { hasAdminAccess } = load('src/lib/admin-policy.ts');
    assert.equal(hasAdminAccess({ user_metadata: { is_admin: true } }), false);
    assert.equal(hasAdminAccess({ email: 'admin@neurafitness.com', email_confirmed_at: '2026-01-01' }), false);
    assert.equal(hasAdminAccess({ app_metadata: { neurafitness_admin: true } }), true);
    process.env.ADMIN_EMAILS = 'owner@example.com';
    assert.equal(hasAdminAccess({ email: 'owner@example.com' }), false);
    assert.equal(hasAdminAccess({ email: 'owner@example.com', email_confirmed_at: '2026-01-01' }), false);
  } finally { if (old === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = old; }
});

test('anonymous and legacy member cookies never query the database or grant access', async () => {
  const auth = load('src/lib/auth.ts', {
    '@/lib/member-session': { getMemberSession: async () => null },
    react: { cache: f => f }, 'next/headers': { cookies: async () => ({ getAll: () => [{ name: 'nf_member_session', value: 'old-token' }] }) },
    '@/lib/prisma': { prisma: new Proxy({}, { get() { throw new Error('Unexpected database access'); } }) },
    '@/utils/supabase/server': { createClient() { throw new Error('Unexpected authentication call'); } },
  });
  assert.equal(await auth.getCurrentStaff(), null);
  assert.equal(await auth.getCurrentMember(), null);
});

test('revoked member auth link denies an otherwise valid Supabase user', async () => {
  const auth = load('src/lib/auth.ts', {
    '@/lib/member-session': { getMemberSession: async () => null },
    react: { cache: f => f }, 'next/headers': { cookies: async () => ({ getAll: () => [{ name: 'sb-test-auth-token' }] }) },
    '@/utils/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'revoked-user' } } }) } }) },
    '@/lib/prisma': { prisma: { member: { findUnique: async ({where}) => { assert.equal(where.authUserId, 'revoked-user'); return null; } } } },
  });
  assert.equal(await auth.getCurrentMember(), null);
});

test('member pass resolves only its gym-scoped member and cannot grant staff access', async () => {
  const auth = load('src/lib/auth.ts', {
    react: {cache:f=>f},
    'next/headers': {cookies:async()=>({getAll:()=>[]})},
    '@/lib/member-session': {getMemberSession:async()=>({memberId:'m1',gymId:'g1'})},
    '@/lib/prisma': {prisma:{member:{findFirst:async q=>{assert.deepEqual(q.where,{id:'m1',gymId:'g1'});return {id:'m1'};}}}},
  });
  assert.equal(await auth.getCurrentStaff(),null);
  assert.deepEqual(await auth.getCurrentMember(),{id:'m1'});
});

test('phone login normalizes country codes, scopes gym and rejects missing or duplicate matches', async () => {
  let session;
  let matches = [];
  let calls=0;
  const actions = load('src/app/member/actions.ts', { ...inert,
    '@/lib/prisma': { prisma: { $queryRaw: async (strings,...values) => { calls++; assert.deepEqual(values,['gym','9876543210']); return matches; } } },
    '@/lib/member-session': {setMemberSession: async (...args) => {session=args;}},
  });
  for(const phone of ['', 'MEM-001', 'abc9876543210', '123']) {
    assert.ok((await actions.loginMember({},form({gymCode:'gym',phone}))).error);
  }
  assert.equal(calls,0);
  assert.ok((await actions.loginMember({},form({gymCode:'gym',phone:'9876543210'}))).error);
  assert.equal(session,undefined);
  matches=[{id:'m1',gymId:'g1'},{id:'m2',gymId:'g1'}];
  assert.match((await actions.loginMember({},form({gymCode:'gym',phone:'9876543210'}))).error,/multiple members/);
  assert.equal(session,undefined);
  matches=[{id:'m1',gymId:'g1'}];
  for(const phone of ['9876543210','+91 98765 43210','09876543210']) {
    assert.equal((await actions.loginMember({},form({gymCode:' GYM ',phone}))).success,true);
    assert.deepEqual(session,['m1','g1']);
  }
});

test('member sessions reject tampering and expiry and are cleared at logout', async () => {
  const old = process.env.MEMBER_SESSION_SECRET;
  process.env.MEMBER_SESSION_SECRET = 'test-only-key';
  const jar = new Map();
  let options;
  try {
    const session = load('src/lib/member-session.ts', {'next/headers':{cookies:async()=>({
      get:key=>jar.has(key)?{value:jar.get(key)}:undefined,
      set:(key,value,opts)=>{jar.set(key,value); options=opts;}, delete:key=>jar.delete(key),
    })}});
    await session.setMemberSession('m1','g1');
    assert.equal(options.httpOnly,true); assert.equal(options.sameSite,'lax');
    assert.deepEqual(await session.getMemberSession(),{memberId:'m1',gymId:'g1'});
    const token=jar.get('nf_member_pass_v1');
    jar.set('nf_member_pass_v1',token+'x');
    assert.equal(await session.getMemberSession(),null);
    jar.set('nf_member_pass_v1',token);
    const now=Date.now; Date.now=()=>now()+86401000;
    try { assert.equal(await session.getMemberSession(),null); } finally {Date.now=now;}
    await session.clearMemberSession();
    assert.equal(await session.getMemberSession(),null);
  } finally {if(old===undefined)delete process.env.MEMBER_SESSION_SECRET;else process.env.MEMBER_SESSION_SECRET=old;}
});

for (const [plan, price] of Object.entries({base_1m:999,base_6m:2399,base_1y:3499,pro_6m:3499,pro_1y:5499})) {
  test(`signup preserves ${plan} price and awaits payment approval`, async () => {
    let saved;
    const actions = load('src/app/signup/actions.ts', {...inert,
      '@/lib/prisma': {prisma:{gym:{findUnique:async()=>null,create:async q=>{saved=q.data;}}}},
      '@/utils/supabase/admin': {createAdminClient:()=>({auth:{admin:{createUser:async()=>({data:{user:{id:'new-user'}}})}}})},
      '@/utils/supabase/server': {createClient:async()=>({auth:{signInWithPassword:async()=>({})}})},
    });
    const result = await actions.signupOwner({},form({gymName:'Test Gym',slug:'test-gym',name:'Test Owner',email:'test@example.com',password:'test-password',plan}));
    assert.equal(result.success,true); assert.equal(saved.subscriptionAmount,price);
    assert.equal(saved.saasPlan,plan.toUpperCase()); assert.equal(saved.saasStatus,'PENDING_APPROVAL'); assert.equal(saved.isSuspended,true);
  });
}

test('signup rejects client-selected pilot/free plans', async () => {
  const { signupOwner } = load('src/app/signup/actions.ts', {...inert,'@/lib/prisma':{prisma:{}}});
  for (const plan of ['pilot','trial','made-up']) assert.ok((await signupOwner({},form({plan}))).error);
});

test('subscription guard rejects suspended, pending, expired and invalid dates', () => {
  const { subscriptionActive } = load('src/lib/subscription.ts');
  const now = new Date('2026-10-19');
  for (const gym of [{saasStatus:'PENDING_APPROVAL'}, {saasStatus:'ACTIVE',isSuspended:true}, {saasStatus:'ACTIVE',saasExpiresAt:'2026-01-01'}, {saasStatus:'ACTIVE',saasExpiresAt:'invalid'}]) assert.equal(subscriptionActive(gym, now),false);
  assert.equal(subscriptionActive({saasStatus:'ACTIVE',saasExpiresAt:'2027-01-01'},now),true);
});

for (const verified of [false,true]) test(`enrollment records ${verified ? 'verified payment' : 'unpaid registration'} correctly`,async()=>{
  let payment;
  const enrollment={id:'enrollment',planId:'plan',name:'Member',phone:'9999999999',amount:1000};
  const tx={ enrollment:{updateMany:async()=>({count:1}),update:async()=>({})},member:{create:async()=>({id:'member',memberships:[{id:'membership'}]})},payment:{findMany:async()=>[],create:async q=>{payment=q.data;}}};
  const { approveEnrollment }=load('src/actions/enrollments.ts',{
    '@/lib/auth':{requireStaff:async()=>({gymId:'gym',gym:{gstRatePercent:18}})},
    '@/lib/biometric':{nextBiometricId:async()=>1},
    '@/lib/prisma':{prisma:{enrollment:{findFirst:async()=>enrollment},plan:{findFirst:async()=>({id:'plan',durationMonths:1})},member:{findMany:async()=>[]},$transaction:async f=>f(tx)}},
  });
  assert.equal((await approveEnrollment('enrollment',undefined,verified)).ok,true);
  assert.equal(payment.status,verified?'PAID':'PENDING'); assert.equal(payment.mode,'Cash');
});

test('concurrent enrollment approval loses claim before creating a member',async()=>{
  let creates=0;
  const { approveEnrollment }=load('src/actions/enrollments.ts',{
    '@/lib/auth':{requireStaff:async()=>({gymId:'gym',gym:{gstRatePercent:18}})}, '@/lib/biometric':{nextBiometricId:async()=>1},
    '@/lib/prisma':{prisma:{enrollment:{findFirst:async()=>({id:'e',planId:'p'})},plan:{findFirst:async()=>({id:'p',durationMonths:1})},member:{findMany:async()=>[]},$transaction:async f=>f({enrollment:{updateMany:async()=>({count:0})},member:{create:async()=>{creates++;}}})}},
  });
  assert.equal((await approveEnrollment('e')).ok,false); assert.equal(creates,0);
});

test('stock sale rejects negative quantities and cross-gym or insufficient stock before sale insertion',async()=>{
  let inserts=0;
  const {sellSupplement}=load('src/actions/supplements.ts',{
    '@/lib/auth':{requireStaff:async()=>({gymId:'gym'})},
    '@/lib/prisma':{prisma:{$transaction:async f=>f({$executeRawUnsafe:async(sql,...args)=>{if(sql.includes('UPDATE')){assert.equal(args[2],'gym');return 0;} inserts++;return 1;}})}},
  });
  const input={supplementId:'other-gym-product',supplementName:'Product',customerName:'Member',quantity:1,unitPrice:100,paymentMode:'Cash'};
  assert.equal((await sellSupplement({...input,quantity:-1})).ok,false);
  assert.equal((await sellSupplement(input)).ok,false); assert.equal(inserts,0);
});

test('ADMS serial number alone and wrong gym keys cannot authenticate a device',async()=>{
  let writes=0;
  const crypto=require('node:crypto');
  const hash=crypto.createHash('sha256').update('correct-key').digest('hex');
  const {findRegisteredDevice}=load('src/lib/biometric.ts',{
    '@/lib/prisma':{prisma:{device:{findUnique:async()=>({id:'device',isActive:true,lastSeenAt:new Date(),gym:{biometricKeyHash:hash}}),update:async()=>{writes++;}}}},
  });
  assert.equal(await findRegisteredDevice('SN-1234',null,''),null);
  assert.equal(await findRegisteredDevice('SN-1234',null,'wrong-key'),null);
  assert.equal(writes,0);
  assert.equal((await findRegisteredDevice('SN-1234',null,'correct-key')).id,'device');
});

test('password reset origin is server configuration, not a caller-supplied URL',()=>{
  const before=process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL='https://neurafitness.vercel.app/path';
    const {siteOrigin}=load('src/lib/site-url.ts');
    assert.equal(siteOrigin(),'https://neurafitness.vercel.app');
    process.env.NEXT_PUBLIC_SITE_URL='javascript:alert(1)';
    assert.throws(()=>siteOrigin());
  } finally {if(before===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=before;}
});
