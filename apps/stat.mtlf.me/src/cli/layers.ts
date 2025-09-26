import { Layer } from "effect";
import { PriceServiceLive, PortfolioServiceLive } from "../lib/stellar";

export const AppLayer = Layer.merge(PriceServiceLive, PortfolioServiceLive);