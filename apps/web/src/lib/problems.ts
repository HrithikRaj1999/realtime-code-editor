export interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  constraints?: string[];
  examples: { input: string; output: string; explanation?: string }[];
  tags?: string[];
  editorial?: string;
  hint?: string;
  testCases?: { input: string; expectedOutput: string; hidden?: boolean }[];
}

export const PROBLEMS: Problem[] = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists.",
    ],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
      },
    ],
    tags: ["Array", "Hash Table"],
    editorial:
      "Use a hash map to store each number and its index as you iterate. For each number, check if (target - num) already exists in the map. This gives O(n) time complexity instead of the O(n²) brute force approach.",
    hint: "The complement of each number (target - nums[i]) is what you should look for in a hash map.",
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
      { input: "[3,3]\n6", expectedOutput: "[0,1]" },
      { input: "[1,2,3,4,5]\n9", expectedOutput: "[3,4]", hidden: true },
    ],
  },
  {
    id: 20,
    title: "Valid Parentheses",
    difficulty: "Easy",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.",
    constraints: ["1 ≤ s.length ≤ 10⁴", "s consists of parentheses only '()[]{}'"],
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    tags: ["String", "Stack"],
    editorial:
      "Use a stack. Push opening brackets onto the stack. For closing brackets, check if the stack top matches. If the stack is empty at the end, the string is valid.",
    hint: "A stack naturally handles the matching order of nested brackets.",
    testCases: [
      { input: "()", expectedOutput: "true" },
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" },
      { input: "([{}])", expectedOutput: "true", hidden: true },
    ],
  },
  {
    id: 206,
    title: "Reverse Linked List",
    difficulty: "Easy",
    description:
      "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    constraints: ["0 ≤ Number of nodes ≤ 5000", "-5000 ≤ Node.val ≤ 5000"],
    examples: [
      { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" },
      { input: "head = [1,2]", output: "[2,1]" },
      { input: "head = []", output: "[]" },
    ],
    tags: ["Linked List", "Recursion"],
    editorial:
      "Iterate through the list, reversing the next pointer of each node. Maintain prev, current, and next pointers. Can also be solved recursively.",
    hint: "Can you reverse the pointers one by one as you traverse?",
  },
  {
    id: 53,
    title: "Maximum Subarray",
    difficulty: "Medium",
    description:
      "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    editorial:
      "Kadane's Algorithm: Track the maximum sum ending at each position. If the running sum becomes negative, reset it. This runs in O(n) time.",
    hint: "At each step, decide: extend the current subarray or start a new one?",
  },
  {
    id: 42,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    description:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    constraints: ["n == height.length", "1 ≤ n ≤ 2 × 10⁴", "0 ≤ height[i] ≤ 10⁵"],
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The elevation map traps 6 units of rain water.",
      },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    tags: ["Array", "Two Pointers", "Stack", "Dynamic Programming"],
    editorial:
      "Use two pointers from both ends. Track leftMax and rightMax. Water at each position is min(leftMax, rightMax) - height[i]. Move the pointer with the smaller max inward.",
    hint: "Water at any position depends on the minimum of the tallest bars to its left and right.",
  },
];
