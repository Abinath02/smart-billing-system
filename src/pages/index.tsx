import Head from 'next/head';
import CustomerMenuPage from './CustomerMenu';

export default function Home() {
  return (
    <>
      <Head>
        <title>Spice Garden | Dine-In Smart Menu &amp; Instant Table Ordering</title>
        <meta
          name="description"
          content="Browse authentic dishes, enjoy live table offers, and place seamless dine-in orders with Spice Garden Smart QR Billing System."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <CustomerMenuPage />
    </>
  );
}

