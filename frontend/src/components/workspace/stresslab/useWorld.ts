/**
 * stresslab/useWorld.ts
 * Single subscription to the shared World for all Stress Lab components.
 */

import { useEffect, useState } from "react";
import { getWorld, subscribeWorld, type World } from "../../../world";

export function useWorld(): World {
  const [world, setWorld] = useState<World>(() => getWorld());

  useEffect(() => {
    setWorld(getWorld());
    const unsub = subscribeWorld((next) => setWorld(next));
    return unsub;
  }, []);

  return world;
}
