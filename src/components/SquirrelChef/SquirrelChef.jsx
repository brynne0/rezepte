import { createLucideIcon } from "lucide-react";

// Lucide Squirrel (2px) wearing a half-size ChefHat with a thinner 1.3 line
const SquirrelChef = createLucideIcon("squirrel-chef", [
  ["path", { d: "M15.236 22a3 3 0 0 0-2.2-5", key: "paw" }],
  [
    "path",
    {
      d: "M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-1.354-3",
      key: "face",
    },
  ],
  ["path", { d: "M18 13h.01", key: "eye" }],
  [
    "path",
    {
      d: "M14.5 10a7 7 0 0 0-7.5 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10",
      key: "body",
    },
  ],
  [
    "path",
    {
      d: "M20 10a.5.5 0 0 0 .5-.5V6.825c0-.229.158-.422.364-.521a2 2 0 0 0-1.067-3.794 2.5 2.5 0 0 0-4.594 0 2 2 0 0 0-1.067 3.794c.206.099.364.292.364.521V9.5a.5.5 0 0 0 .5.5Z",
      key: "hat",
      strokeWidth: 1.3,
    },
  ],
  ["path", { d: "M14.5 7.5h6", key: "band", strokeWidth: 1.3 }],
]);

export default SquirrelChef;
