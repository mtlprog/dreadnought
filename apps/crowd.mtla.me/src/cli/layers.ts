import { ProjectServiceLive, StellarCheckServiceLive, StellarServiceLive } from "@/lib/stellar";
import { Layer } from "effect";
import { EnvironmentServiceLive } from "./services/environment.service";
import { PinataServiceLive } from "./services/pinata.service";

export const AppLayer = Layer.mergeAll(
  EnvironmentServiceLive,
  PinataServiceLive,
  StellarServiceLive,
  StellarCheckServiceLive,
  ProjectServiceLive,
);
