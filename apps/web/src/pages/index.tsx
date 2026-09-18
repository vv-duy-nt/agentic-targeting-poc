import type { NextPage } from "next";
import Head from "next/head";
import HomePage from "../app/page";

const Home: NextPage = () => (
  <>
    <Head>
      <title>Matoi | AI Customer Targeting</title>
      <meta
        name="description"
        content="AI customer targeting proof of concept"
      />
    </Head>
    <HomePage />
  </>
);

export default Home;
