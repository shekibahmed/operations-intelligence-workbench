export function headers(): Promise<Headers> {
  return Promise.resolve(new Headers({ "x-real-ip": "203.0.113.42" }));
}
