# ABN SHOP Tangail — Secure starter project (বাংলা)

এটি production-oriented starter, কিন্তু অ্যাকাউন্টে deploy ও পরীক্ষা না করা পর্যন্ত live/production-ready বলা যাবে না। এটি localStorage-ভিত্তিক আগের demo-র বদলি।

## দরকার হবে
- একটি GitHub account (ফ্রি)
- Cloudflare account (ফ্রি)
- Supabase account/project (ফ্রি tier; inactivity-তে project pause হতে পারে)
- ইমেইল নোটিফিকেশনের জন্য Resend account/API key (ঐচ্ছিক; provider limits/verification প্রযোজ্য)

## 1) Supabase project তৈরি
1. https://supabase.com এ sign up করে New project তৈরি করুন।
2. Database password শক্তিশালী করুন এবং নিরাপদ password manager-এ রাখুন।
3. Project dashboard → SQL Editor → New query খুলুন।
4. `supabase/schema.sql`-এর সব SQL paste করে Run করুন।
5. Authentication → Users থেকে আপনার admin email/password দিয়ে user তৈরি করুন (public signup চালু করবেন না)।
6. SQL Editor-এ `YOUR_ADMIN_USER_UUID` বদলে নিচের statement চালান:
   `insert into public.admin_users(user_id) values ('YOUR_ADMIN_USER_UUID');`
   UUID পেতে Authentication → Users তালিকায় user ID দেখুন।
7. Project Settings → API থেকে Project URL ও publishable/anon key কপি করুন. Secret/service_role key কখনো browser code-এ দেবেন না.

## 2) Frontend config
1. `config.js.example`-এর কপি করে `config.js` নামে রাখুন.
2. `SUPABASE_URL` ও `SUPABASE_ANON_KEY` বসান.
3. `index.html`-এর head-এ `app.js`-এর আগে `<script src="config.js"></script>` যোগ করুন.
4. `config.js`-এ শুধু public publishable/anon key থাকবে. Service role key কখনোই নয়.
5. `config.js`-কে Git-এ commit করা যায় only if it contains the public key; service key/Resend key কখনো commit করবেন না.

## 3) Edge Function deploy
Supabase CLI / terminal (কম্পিউটার থাকলে) থেকে:
```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy submit-order
supabase secrets set SITE_ORIGIN=https://YOUR-SITE.pages.dev
supabase secrets set ORDER_NOTIFY_EMAIL=you@example.com
supabase secrets set ORDER_FROM_EMAIL="ABN SHOP <verified-sender@your-domain.example>"
supabase secrets set RESEND_API_KEY=re_...
```
`SUPABASE_URL` এবং `SUPABASE_SERVICE_ROLE_KEY` Supabase Edge Functions-এর default server-side secrets হিসেবে থাকে; Dashboard → Edge Functions → Secrets-এ নিশ্চিত করুন. কোনো secret browser-এ রাখবেন না.
- Resend ব্যবহার করলে sender/domain verification ও provider policy লাগতে পারে. Domain না থাকলে email sender setup সীমিত হতে পারে. Email failure হলে order save থাকবে; function logs দেখুন.
- `SITE_ORIGIN` অবশ্যই deploy হওয়া ঠিক URL-এর সঙ্গে হুবহু মিলবে, শেষে slash নয়.

Dashboard-only deploy সুবিধা/সীমাবদ্ধতা UI বদলাতে পারে. Edge Function-এর `index.ts` Supabase Dashboard → Edge Functions-এও তৈরি/পেস্ট করা যায়, তবে dependency/import এবং secrets সঠিকভাবে সেট করতে হবে.

## 4) Cloudflare Pages deploy (GitHub path)
1. GitHub-এ নতুন repository `abn-shop-tangail` তৈরি করুন.
2. এই project files upload/commit করুন; `config.js` যোগ করুন.
3. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git → repository নির্বাচন করুন.
4. Static HTML হলে build command ফাঁকা রাখুন এবং output directory `/` বা project root নির্ধারণ করুন (dashboard-এর বর্তমান নির্দেশনা অনুসরণ করুন).
5. Deploy হলে `https://<project-name>.pages.dev` URL পাবেন. এই exact URL `SITE_ORIGIN` secret-এ বসিয়ে Edge Function redeploy/secret update করুন.

## 5) লাইভ করার আগে আবশ্যক checklist
- [ ] Supabase Auth-এ public signups বন্ধ
- [ ] শুধু আপনার নির্দিষ্ট user UUID `admin_users` টেবিলে আছে
- [ ] SQL RLS policies প্রয়োগ হয়েছে
- [ ] Browser-এ service role key নেই; secret keys GitHub-এ নেই
- [ ] SITE_ORIGIN actual Pages URL-এর সঙ্গে মেলে
- [ ] Test order দিলে `orders` ও `order_items`-এ row তৈরি হয়
- [ ] Admin ছাড়া order/customer table পড়া যায় না
- [ ] Admin login ছাড়া product/order management চলে না
- [ ] Invalid product ID/price tampering request reject হয় (server product price calculates total)
- [ ] Email notification deliverability checked
- [ ] Backup/export plan এবং privacy/return/delivery policy যোগ করা হয়েছে
- [ ] Spam/abuse protection: rate limiting/CAPTCHA or challenge added before public launch
- [ ] Order creation concurrency/transaction behavior reviewed; see note below

## Security notes / known work before a real public launch
- The function validates fields and calculates prices server-side, but public endpoint can still be abused with repeated requests. Add Cloudflare Turnstile and rate limiting before advertising the shop.
- Current order + item inserts are two database operations, with cleanup if item insert fails. For stronger atomicity, replace with a Postgres RPC transaction or dedicated transaction-backed server operation.
- This starter doesn't implement inventory/stock, shipping fee, cancellation workflow, WhatsApp/SMS, customer order lookup, or backup automation.
- Email notification is best-effort; monitor Edge Function logs and consider a durable notification queue if business-critical.
- Supabase Free has no automatic backups and can pause after inactivity. Keep periodic exports; verify current limits before relying on free tier.
- Use an exact allowed origin and add stricter rate limiting / abuse protection. Don't collect more customer information than needed.
- Never paste credentials into chat. If a secret leaks, rotate it immediately.
