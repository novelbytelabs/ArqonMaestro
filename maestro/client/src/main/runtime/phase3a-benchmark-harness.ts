import { phase3ABenchmarkService } from "./phase3a-benchmark-service";

export const getPhase3ABenchmarkSnapshot = () => phase3ABenchmarkService.getSnapshot();

export const resetPhase3ABenchmarkSnapshot = () => phase3ABenchmarkService.reset();
