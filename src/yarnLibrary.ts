import { ColorRGB } from "./common/color";

const YARN_LIBRARY_KEY = "silver-reed-write-yarn-library";

export type YarnLibraryEntry = {
  id: string;
  name: string;
  color: ColorRGB;
};

let yarnLibrary: YarnLibraryEntry[] = [];
let listeners: (() => void)[] = [];
let loaded = false;

// Load yarn library from localStorage
export function loadYarnLibrary(): YarnLibraryEntry[] {
  try {
    const stored = localStorage.getItem(YARN_LIBRARY_KEY);
    if (stored) {
      yarnLibrary = JSON.parse(stored);
    } else {
      yarnLibrary = [];
    }
  } catch (e) {
    console.error("Failed to load yarn library:", e);
    yarnLibrary = [];
  }
  loaded = true;
  return yarnLibrary;
}

// Save yarn library to localStorage
function saveYarnLibrary() {
  try {
    localStorage.setItem(YARN_LIBRARY_KEY, JSON.stringify(yarnLibrary));
  } catch (e) {
    console.error("Failed to save yarn library:", e);
  }
}

// Get current yarn library
export function getYarnLibrary(): YarnLibraryEntry[] {
  if (!loaded) {
    loadYarnLibrary();
  }
  return yarnLibrary;
}

// Add a new yarn to the library
export function addYarn(name: string, color: ColorRGB): YarnLibraryEntry {
  const id = `yarn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newYarn: YarnLibraryEntry = { id, name, color };
  yarnLibrary.push(newYarn);
  saveYarnLibrary();
  notifyListeners();
  return newYarn;
}

// Remove a yarn from the library
export function removeYarn(id: string): boolean {
  const index = yarnLibrary.findIndex((y) => y.id === id);
  if (index !== -1) {
    yarnLibrary.splice(index, 1);
    saveYarnLibrary();
    notifyListeners();
    return true;
  }
  return false;
}

// Update a yarn in the library
export function updateYarn(id: string, name: string, color: ColorRGB): boolean {
  const yarn = yarnLibrary.find((y) => y.id === id);
  if (yarn) {
    yarn.name = name;
    yarn.color = color;
    saveYarnLibrary();
    notifyListeners();
    return true;
  }
  return false;
}

// Find a yarn by ID
export function findYarnById(id: string): YarnLibraryEntry | undefined {
  return getYarnLibrary().find((y) => y.id === id);
}

// Find a yarn by color (exact match)
export function findYarnByColor(color: ColorRGB): YarnLibraryEntry | undefined {
  return getYarnLibrary().find(
    (y) =>
      y.color[0] === color[0] &&
      y.color[1] === color[1] &&
      y.color[2] === color[2],
  );
}

// Subscribe to yarn library changes
export function subscribeToYarnLibrary(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

// Initialize the library on module load
loadYarnLibrary();
