export var x = 13;

export function x() {
  return 13;
}

export class A {
  foo() {}
}

export function x() {
  class A {
    foo() {}
  }
}
