// Random code-snippet generator for the hero typing animation.
// No LLM. Picks (language, problem-kind, problem) and composes a snippet
// from per-language fragments + a small identifier pool. Output is an
// array of lines for Typed.js to type one at a time.
//
// Languages : html, ruby, rust
// Kinds     : html → display markup
//             ruby → hard algorithm OR irb transcript
//             rust → hard algorithm
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CodeGen = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickN = (arr, n) => {
    const a = arr.slice();
    const out = [];
    for (let i = 0; i < n && a.length; i++) {
      out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
    }
    return out;
  };

  const POOL = {
    arr:    ['nums', 'values', 'items', 'xs'],
    tot:    ['total', 'sum', 'acc'],
    best:   ['best', 'largest', 'top'],
    item:   ['n', 'x', 'v'],
    n:      ['n', 'k', 'limit'],
    a:      ['a', 'prev'],
    b:      ['b', 'curr'],
    sumFn:  ['sum_of', 'total_of', 'add_up'],
    maxFn:  ['max_of', 'find_max', 'largest_in'],
    fibFn:  ['fib', 'fibonacci', 'nth_fib'],
    word:   ['hello', 'sveltekitbook', 'matronae', 'rizal', 'plasticity'],
    fruit:  ['apple', 'pear', 'mango', 'plum', 'fig'],
    label:  ['Email', 'Username', 'Title', 'Search'],
    btn:    ['Send', 'Submit', 'Save', 'Go'],
    route:  ['/about', '/blog', '/contact', '/projects'],
    routeName: ['About', 'Blog', 'Contact', 'Projects'],
    cardTitle: ['Sentinel RB', 'Plasticity', 'By Degrees', 'Déjà Vu'],
    cardBody:  [
      'A Rust watcher that keeps signatures in sync.',
      'Context windows as synthetic synapses.',
      'U.S. policy mapped on a −5..+5 spectrum.',
      'The science of memory, dissociation, and forgetting.',
    ],
  };

  // ---------- HTML — display problems --------------------------------------

  const HTML = {
    card() {
      const i = Math.floor(Math.random() * POOL.cardTitle.length);
      return [
        '<div class="card">',
        `  <h3>${POOL.cardTitle[i]}</h3>`,
        `  <p>${POOL.cardBody[i]}</p>`,
        '</div>',
      ];
    },
    form() {
      const label = pick(POOL.label);
      const btn = pick(POOL.btn);
      return [
        '<form action="/submit" method="post">',
        `  <label for="field">${label}</label>`,
        `  <input id="field" name="${label.toLowerCase()}" type="text" />`,
        `  <button type="submit">${btn}</button>`,
        '</form>',
      ];
    },
    list() {
      const items = pickN(POOL.fruit, 3);
      return ['<ul>'].concat(items.map((x) => `  <li>${x}</li>`)).concat(['</ul>']);
    },
    nav() {
      const links = pickN([0, 1, 2, 3], 3).map((i) => ({
        href: POOL.route[i], name: POOL.routeName[i],
      }));
      return ['<nav>'].concat(
        links.map((l) => `  <a href="${l.href}">${l.name}</a>`)
      ).concat(['</nav>']);
    },
  };

  // ---------- Ruby — algorithms --------------------------------------------

  const RUBY_ALGO = {
    sumArray() {
      const arr = pick(POOL.arr);
      const tot = pick(POOL.tot);
      const x = pick(POOL.item);
      return [
        '# sum the elements of an array',
        `def ${pick(POOL.sumFn)}(${arr})`,
        `  ${tot} = 0`,
        `  ${arr}.each { |${x}| ${tot} += ${x} }`,
        `  ${tot}`,
        'end',
      ];
    },
    findMax() {
      const arr = pick(POOL.arr);
      const best = pick(POOL.best);
      const x = pick(POOL.item);
      return [
        '# find the largest element',
        `def ${pick(POOL.maxFn)}(${arr})`,
        `  ${best} = ${arr}[0]`,
        `  ${arr}.each { |${x}| ${best} = ${x} if ${x} > ${best} }`,
        `  ${best}`,
        'end',
      ];
    },
    fib() {
      const n = pick(POOL.n);
      const a = pick(POOL.a);
      const b = pick(POOL.b);
      return [
        '# nth fibonacci, iterative',
        `def ${pick(POOL.fibFn)}(${n})`,
        `  ${a}, ${b} = 0, 1`,
        `  ${n}.times { ${a}, ${b} = ${b}, ${a} + ${b} }`,
        `  ${a}`,
        'end',
      ];
    },
  };

  // ---------- Ruby — irb transcripts ---------------------------------------

  const RUBY_IRB = {
    arrayMap() {
      const xs = pickN([1, 2, 3, 4, 5, 6], 4).sort((a, b) => a - b);
      const sq = xs.map((n) => n * n);
      return [
        `irb> [${xs.join(', ')}].map { |n| n * n }`,
        `=> [${sq.join(', ')}]`,
      ];
    },
    stringChars() {
      const w = pick(POOL.word);
      const uniq = Array.from(new Set(w.split(''))).length;
      return [
        `irb> "${w}".chars.uniq.length`,
        `=> ${uniq}`,
      ];
    },
    hashMerge() {
      return [
        'irb> { a: 1, b: 2 }.merge(c: 3)',
        '=> {a: 1, b: 2, c: 3}',
      ];
    },
    rangeStep() {
      const start = pick([0, 1, 2]);
      const stop = pick([15, 20, 25]);
      const step = pick([3, 5]);
      const out = [];
      for (let i = start; i <= stop; i += step) out.push(i);
      return [
        `irb> (${start}..${stop}).step(${step}).to_a`,
        `=> [${out.join(', ')}]`,
      ];
    },
    select() {
      const xs = pickN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 6).sort((a, b) => a - b);
      const evens = xs.filter((n) => n % 2 === 0);
      return [
        `irb> [${xs.join(', ')}].select(&:even?)`,
        `=> [${evens.join(', ')}]`,
      ];
    },
  };

  // ---------- Rust — algorithms --------------------------------------------

  const RUST_ALGO = {
    sumArray() {
      const arr = pick(POOL.arr);
      const tot = pick(POOL.tot);
      const x = pick(POOL.item);
      return [
        '// sum the elements of a slice',
        `fn ${pick(POOL.sumFn)}(${arr}: &[i32]) -> i32 {`,
        `    let mut ${tot} = 0;`,
        `    for &${x} in ${arr} {`,
        `        ${tot} += ${x};`,
        '    }',
        `    ${tot}`,
        '}',
      ];
    },
    findMax() {
      const arr = pick(POOL.arr);
      const best = pick(POOL.best);
      const x = pick(POOL.item);
      return [
        '// find the largest element',
        `fn ${pick(POOL.maxFn)}(${arr}: &[i32]) -> i32 {`,
        `    let mut ${best} = ${arr}[0];`,
        `    for &${x} in ${arr} {`,
        `        if ${x} > ${best} { ${best} = ${x}; }`,
        '    }',
        `    ${best}`,
        '}',
      ];
    },
    fib() {
      const n = pick(POOL.n);
      const a = pick(POOL.a);
      const b = pick(POOL.b);
      return [
        '// nth fibonacci, iterative',
        `fn ${pick(POOL.fibFn)}(${n}: u32) -> u64 {`,
        `    let (mut ${a}, mut ${b}) = (0u64, 1u64);`,
        `    for _ in 0..${n} {`,
        `        let next = ${a} + ${b};`,
        `        ${a} = ${b};`,
        `        ${b} = next;`,
        '    }',
        `    ${a}`,
        '}',
      ];
    },
  };

  const SNIPPETS = [
    HTML.card, HTML.form, HTML.list, HTML.nav,
    RUBY_ALGO.sumArray, RUBY_ALGO.findMax, RUBY_ALGO.fib,
    RUBY_IRB.arrayMap, RUBY_IRB.stringChars, RUBY_IRB.hashMerge,
    RUBY_IRB.rangeStep, RUBY_IRB.select,
    RUST_ALGO.sumArray, RUST_ALGO.findMax, RUST_ALGO.fib,
  ];

  function generate() {
    return pick(SNIPPETS)();
  }

  return { generate };
});
