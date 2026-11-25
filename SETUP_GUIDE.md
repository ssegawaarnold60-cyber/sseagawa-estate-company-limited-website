# SSEGAWA ESTATE COMPANY — Website + Administrator Dashboard

This package contains the public real-estate website, a private staff dashboard, database/security setup, and the photos supplied for this project.

## Recommended hosting
- **Cloudflare Pages** serves the static website.
- **Supabase** provides the database, staff sign-in, and property photo storage.
- No paid server is required for the website files. Supabase usage limits/pricing depend on your account and traffic.

## Important: one-time setup is required
The dashboard cannot securely manage real listings until it is connected to a Supabase project. This ZIP is the complete website application and setup package; it is not already connected to a live database, and no administrator passwords have been created.

### 1. Create the Supabase project
1. Open https://supabase.com and create/sign in to your account.
2. Create a project named `ssegawa-estate-company`.
3. Save the database password privately.
4. In the project, open **SQL Editor** → **New query**.
5. Open `supabase_setup.sql` from this ZIP, copy all its contents, paste into SQL Editor and click **Run**.
   - This creates property, staff and inquiry tables.
   - It enables Row Level Security (RLS).
   - It creates the public property-images bucket and staff-only upload policies.
   - It adds the three starter listings: Wakiso Town UGX 50M, Namayumba UGX 10M (3 km from main Hoima Road), and Gobero UGX 20M (1 km from main Hoima Road).

### 2. Connect the website to Supabase
1. In Supabase open **Project Settings → API** (or **Data API**, depending on dashboard layout).
2. Copy the **Project URL**.
3. Copy the **anon / publishable key**. Do not copy the `service_role` or secret key.
4. Open `config.js` in this website folder using Notepad.
5. Replace the two placeholder values:
   - `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
   - `PASTE_YOUR_SUPABASE_ANON_KEY_HERE`
6. Save the file.

The anon/publishable key is designed for browser use. The service_role key must never be placed in website files, GitHub, or a public repository.

### 3. Create and authorise multiple staff accounts
For each staff member:
1. In Supabase go to **Authentication → Users → Add user** (or **Invite user**).
2. Enter the staff member's email and invite/create the account.
3. Confirm the user appears in the Users list.
4. Open **SQL Editor** and run this command, replacing the email with the exact invited account email:

```sql
insert into public.staff_members (user_id, role, active)
select id, 'admin', true
from auth.users
where lower(email) = lower('staff@example.com')
on conflict (user_id) do update set role = 'admin', active = true;
```

Repeat for every authorised person. You can use role `'editor'` instead of `'admin'` if you later want to distinguish staff roles; currently both authorised roles have the same dashboard permissions. To revoke access, run:

```sql
update public.staff_members
set active = false
where user_id = (select id from auth.users where lower(email) = lower('staff@example.com'));
```

Do not share one password among staff. Each person should use their own account and a unique password. Only people you add to `staff_members` can use the dashboard.

### 4. Test locally
- Open `index.html` in a browser to preview the public website.
- For best results, serve the folder with a local static server (for example VS Code Live Server) because browser modules/CDN and authentication redirects can behave differently from `file://`.
- Open `admin.html`, sign in with an authorised staff account, and test adding/editing/publishing a test property.
- Test the public inquiry form and check that the inquiry appears in the dashboard.

### 5. Publish on Cloudflare Pages
1. Create a GitHub repository and upload the contents of this folder (including `assets/`, `index.html`, `admin.html`, JS/CSS, and `config.js`).
2. In Cloudflare Dashboard open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository.
4. Framework preset: **None**. Build command: leave blank. Build output directory: `/` or the repository root as prompted.
5. Deploy. Cloudflare will provide a `pages.dev` address.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to your deployed website URL and add the deployed URL to Redirect URLs. Add your custom domain too if you connect one later.

You can also use another static host, but Cloudflare Pages is the recommended option for this static front end.

## What staff can do
- Sign in with an invited, authorised account.
- Add property listings and upload multiple photos (JPEG/PNG/WebP, up to 8 MB each).
- Change titles, location, prices, plot sizes, road distances and descriptions.
- Publish or hide listings.
- Delete property records.
- Review inquiries, contact customers on WhatsApp, mark inquiries handled, or delete them.

The public website only displays published properties. Public visitors can submit inquiries but cannot view inquiries or manage property records.

## Current company information in the website
- Company: SSEGAWA ESTATE COMPANY
- Owner: Kibira Arnold Ssegawa
- Phone / WhatsApp: 0708759877
- Email entered exactly as supplied: `kibiraarnold8@gamil.com`
- Office: Galuleeba Building, opposite Wakiso Town Park, along Kampala–Hoima Road, Wakiso, Uganda
- TikTok: `@kibiraarnold4`
- Free site inspections
- Land advertised as titled; buyers should verify the actual title and ownership documents for the selected plot.
- Plot sizes start at 50 x 100 and beyond.
- Installment arrangement discussed at the office: 70% initial payment and remaining 30% within three months, subject to a written agreement.
- Discounts are available subject to discussion.

## Important notes
- The email was typed as `gamil.com` in the request. Confirm whether the intended address is `gmail.com` before publishing.
- The property photos are the photos supplied in this conversation. The image-to-property assignment can be changed in the admin dashboard by uploading the correct photos to each listing.
- This is a starter production deployment package. Before accepting live customer payments, have the company verify title documents, plot boundaries, payment terms and the legal documents for each property.
- This package does not include an online payment gateway or a custom domain purchase.
