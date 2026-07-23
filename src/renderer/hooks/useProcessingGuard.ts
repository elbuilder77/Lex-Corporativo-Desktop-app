import { useUiStore, type RuntimeHealth } from '../store/useUiStore';

type GuardedCapability = keyof RuntimeHealth['capabilities'];

export function useProcessingGuard(capability: GuardedCapability, intent: string) {
  const ready = useUiStore((state) => state.runtimeHealth?.capabilities[capability].ready ?? false);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);

  return () => {
    if (ready) return true;
    requestProcessingSetup(intent);
    return false;
  };
}
