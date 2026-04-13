"use client";

import { useRouter } from "next/navigation";
import {
  writeExploreRouteFilterForNavigation,
  type ExploreRouteFilterPayload
} from "@/lib/explore-route-filter";

type Props = ExploreRouteFilterPayload;

export function SharedRouteFilterExplorerCta({ barIds, title }: Props) {
  const router = useRouter();

  function handleClick() {
    writeExploreRouteFilterForNavigation({ barIds, title }, "lista");
    router.push("/");
  }

  return (
    <button type="button" className="shared-route-filter-explorer-cta" onClick={handleClick}>
      Filtrar no Explorer
    </button>
  );
}
