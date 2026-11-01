import Link from "next/link";
import { valentine } from "@/content/valentine";

export default function NotFound() {
  const { title, body, back } = valentine.notFound;
  return (
    <main className="notice">
      <h1>{title}</h1>
      <p>{body}</p>
      <Link className="send" href="/">
        {back}
      </Link>
    </main>
  );
}
