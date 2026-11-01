import Link from "next/link";

export default function NotFound() {
  return (
    <main className="notice">
      <h1>This page drifted off into the night</h1>
      <p>The heart is still where it was.</p>
      <Link className="send" href="/">
        Back to the heart
      </Link>
    </main>
  );
}
