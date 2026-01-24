This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

This project requires Firebase for authentication and data storage. Before running the application, you need to set up your environment variables:

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Get your Firebase configuration values from the [Firebase Console](https://console.firebase.google.com/):
   - Go to your Firebase project settings
   - Under "Your apps", find your web app configuration
   - Copy the configuration values

3. Update `.env.local` with your Firebase configuration values:
   - `NEXT_PUBLIC_FIREBASE_API_KEY` - Your Firebase API key
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
   - `NEXT_PUBLIC_FIREBASE_APP_ID` - Your Firebase app ID
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Your Firebase measurement ID (optional)

> **Note:** Make sure your Firebase project is properly configured with Authentication and Firestore enabled before running the application.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
