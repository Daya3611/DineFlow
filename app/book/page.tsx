import { redirect } from "next/navigation";

export default function OldBookPage({ searchParams }: { searchParams: { restaurantId?: string } }) {
  if (searchParams.restaurantId) {
    redirect(`/book/${searchParams.restaurantId}`);
  }
  
  redirect("/");
}
