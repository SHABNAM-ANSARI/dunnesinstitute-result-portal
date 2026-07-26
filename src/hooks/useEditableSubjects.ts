import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSubjectsForClass,
  type SubjectDef,
  type SubjectType,
} from "@/data/subjectMapping";

const storageKey = (className: string) => `subjects_override:${className}`;

const loadOverride = (className: string): SubjectDef[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(className));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (s) => s && typeof s.name === "string" && (s.type === "regular" || s.type === "credit"),
    ) as SubjectDef[];
  } catch {
    return null;
  }
};

const saveOverride = (className: string, list: SubjectDef[] | null) => {
  if (typeof window === "undefined") return;
  if (list === null) window.localStorage.removeItem(storageKey(className));
  else window.localStorage.setItem(storageKey(className), JSON.stringify(list));
};

export function useEditableSubjects(className: string) {
  const defaults = useMemo(() => getSubjectsForClass(className), [className]);
  const [subjects, setSubjects] = useState<SubjectDef[]>(defaults);
  const [isCustomized, setIsCustomized] = useState(false);

  useEffect(() => {
    const override = loadOverride(className);
    if (override && override.length) {
      setSubjects(override);
      setIsCustomized(true);
    } else {
      setSubjects(getSubjectsForClass(className));
      setIsCustomized(false);
    }
  }, [className]);

  const persist = useCallback(
    (next: SubjectDef[]) => {
      setSubjects(next);
      setIsCustomized(true);
      saveOverride(className, next);
    },
    [className],
  );

  const addSubject = useCallback(
    (name: string, type: SubjectType) => {
      const clean = name.trim();
      if (!clean) return false;
      if (subjects.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return false;
      persist([...subjects, { name: clean, type }]);
      return true;
    },
    [subjects, persist],
  );

  const updateSubject = useCallback(
    (index: number, patch: Partial<SubjectDef>) => {
      const next = subjects.map((s, i) => (i === index ? { ...s, ...patch } : s));
      if (patch.name !== undefined) {
        const clean = String(patch.name).trim();
        if (!clean) return false;
        if (
          next.filter((_, i) => i !== index).some(
            (s) => s.name.toLowerCase() === clean.toLowerCase(),
          )
        )
          return false;
        next[index] = { ...next[index], name: clean };
      }
      persist(next);
      return true;
    },
    [subjects, persist],
  );

  const deleteSubject = useCallback(
    (index: number) => {
      persist(subjects.filter((_, i) => i !== index));
    },
    [subjects, persist],
  );

  const moveSubject = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= subjects.length) return;
      const next = subjects.slice();
      [next[index], next[target]] = [next[target], next[index]];
      persist(next);
    },
    [subjects, persist],
  );

  const resetToDefault = useCallback(() => {
    saveOverride(className, null);
    setSubjects(getSubjectsForClass(className));
    setIsCustomized(false);
  }, [className]);

  return { subjects, isCustomized, addSubject, updateSubject, deleteSubject, moveSubject, resetToDefault };
}
