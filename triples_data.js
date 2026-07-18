

const TRIPLES = [
  {
    id: 1,
    type: [3,3,3],
    d: 3,
    sigma_a: [[1,2,3]],
    sigma_b: [[1,2,3]],
    sigma_c: [[1,2,3]],
    source: "Thesis example #1"
  },
  {
    id: 2,
    type: [2,4,4],
    d: 4,
    sigma_a: [[1,3], [2,4]],
    sigma_b: [[1,2,3,4]],
    sigma_c: [[1,2,3,4]],
    source: "Thesis example #2"
  },
  {
    id: 3,
    type: [3,3,3],
    d: 4,
    sigma_a: [[2,4,3]],
    sigma_b: [[1,3,4]],
    sigma_c: [[1,2,3]],
    source: "Thesis example #3"
  },
  {
    id: 4,
    type: [2,4,4],
    d: 5,
    sigma_a: [[1,4], [2,3]],
    sigma_b: [[2,3,5,4]],
    sigma_c: [[1,4,5,2]],
    source: "Thesis example #4"
  },
  {
    id: 5,
    type: [2,3,6],
    d: 6,
    sigma_a: [[1,4], [2,5], [3,6]],
    sigma_b: [[1,3,5], [2,4,6]],
    sigma_c: [[1,2,3,4,5,6]],
    source: "Thesis example #5"
  },
  {
    id: 6,
    type: [3,3,3],
    d: 6,
    sigma_a: [[1,6,2], [3,5,4]],
    sigma_b: [[1,6,5], [2,4,3]],
    sigma_c: [[1,3,5], [2,4,6]],
    source: "Thesis example #6"
  },
  {
    id: 7,
    type: [2,3,6],
    d: 6,
    sigma_a: [[1,4]],
    sigma_b: [[1,2,6], [3,4,5]],
    sigma_c: [[1,6,2,4,3,5]],
    source: "Thesis example #7"
  },
  {
    id: 8,
    type: [2,4,4],
    d: 6,
    sigma_a: [[1,3], [2,4]],
    sigma_b: [[1,6,3,2], [4,5]],
    sigma_c: [[1,4,5,2], [3,6]],
    source: "Thesis example #8"
  },
  {
    id: 9,
    type: [3,3,3],
    d: 7,
    sigma_a: [[1,4,2], [3,5,6]],
    sigma_b: [[1,3,4], [2,7,6]],
    sigma_c: [[2,5,3], [4,6,7]],
    source: "Thesis example #9"
  },
  {
    id: 10,
    type: [2,3,6],
    d: 7,
    sigma_a: [[1,6], [2,5], [3,4]],
    sigma_b: [[2,5,3], [4,6,7]],
    sigma_c: [[1,6,3,2,4,7]],
    source: "Thesis example #10"
  },
  {
    id: 11,
    type: [2,4,4],
    d: 8,
    sigma_a: [[1,5], [2,6], [3,7], [4,8]],
    sigma_b: [[1,4,3,6], [2,5,8,7]],
    sigma_c: [[1,2,3,8], [4,5,6,7]],
    source: "Thesis example #11"
  },
  {
    id: 12,
    type: [2,3,6],
    d: 8,
    sigma_a: [[1,4], [2,7], [3,6], [5,8]],
    sigma_b: [[1,3,8], [4,7,6]],
    sigma_c: [[1,5,8,6,2,7], [3,4]],
    source: "Thesis example #12"
  },
  {
    id: 13,
    type: [2,4,4],
    d: 9,
    sigma_a: [[1,5], [2,4], [3,9], [7,8]],
    sigma_b: [[1,9,4,5], [2,8,3,6]],
    sigma_c: [[2,6,9,5], [3,7,8,4]],
    source: "Thesis example #13"
  },
  {
    id: 14,
    type: [2,3,6],
    d: 9,
    sigma_a: [[2,9], [3,8], [4,7], [5,6]],
    sigma_b: [[1,5,8], [2,3,6], [4,7,9]],
    sigma_c: [[1,3,9,4,2,5], [6,8]],
    source: "Thesis example #14"
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TRIPLES };
} else {
  window.TRIPLES = TRIPLES;
}
