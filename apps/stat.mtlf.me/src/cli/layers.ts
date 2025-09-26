import { Layer } from "effect";
import { PortfolioServiceLive, PriceServiceLive } from "../lib/stellar";

export const AppLayer = Layer.merge(PriceServiceLive, PortfolioServiceLive);
