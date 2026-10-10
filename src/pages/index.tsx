import Head from 'next/head';
import CustomerMenuPage from './CustomerMenu';

export default function Home() {
  return (
    <>
      <Head>
        <title>Restaurant Smart QR Menu</title>
        <meta name="description" content="Dine-in Smart Menu and Instant Table Ordering" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <CustomerMenuPage />
    </>
  );
}

