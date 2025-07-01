export function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowercased = value.trim().toLowerCase();
    if (lowercased === 'true') {
      return true;
    }
    if (lowercased === 'false') {
      return false;
    }
  }

  throw new Error(`Can't transform ${value} to boolean`);
}
