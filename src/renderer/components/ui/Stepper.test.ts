import { describe, expect, it } from 'vitest';
import { isStepperStepCompleted } from './Stepper';

describe('Stepper progress truth', () => {
  it('does not complete earlier steps only because navigation moved forward', () => {
    expect(isStepperStepCompleted([], 0)).toBe(false);
    expect(isStepperStepCompleted([], 1)).toBe(false);
  });

  it('marks only explicitly completed steps', () => {
    expect(isStepperStepCompleted([1, 3], 0)).toBe(false);
    expect(isStepperStepCompleted([1, 3], 1)).toBe(true);
    expect(isStepperStepCompleted([1, 3], 2)).toBe(false);
    expect(isStepperStepCompleted([1, 3], 3)).toBe(true);
  });
});
