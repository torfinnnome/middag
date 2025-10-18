'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';

// --- Interfaces ---
interface WeeklyPlanItem {
    id: string;
    day: string;
    dayKey: string; // Keep track of the underlying day key (monday, tuesday, etc.)
    meal: string;
    category: string;
}

interface MealPlannerProps {
    allCategories: string[];
    mealsData: { [key: string]: string[] };
}

interface SavedPlanState {
  weeklyPlan: WeeklyPlanItem[];
  lockedItemIds: string[];
  selectedCategories: string[];
  language: LanguageKey;
  scoringMethod: ScoringMethod;
}

// Interface for SortableMealItem props, including the new meal update handler
interface SortableMealItemProps {
  item: WeeklyPlanItem;
  isLocked: boolean;
  onLockToggle: (id: string) => void;
  onMealUpdate: (id: string, newMeal: string) => void; // Handler for manual meal edits
  // 'language' is added separately via '&' in the component signature below
}


// --- Language Configuration ---
const languages = {
    en: 'EN',
    no: 'NO',
    es: 'ES'
};
type LanguageKey = keyof typeof languages;

const translations = {
    en: {
        selectCategories: "Select Categories:",
        createNewPlan: "Update Plan",
        showCopyTable: "Show Copy-Friendly Table",
        hideCopyTable: "Hide Copy-Friendly Table",
        weeklyPlanTitle: "Weekly Plan:",
        copyPlanTitle: "Copy-Friendly Weekly Plan:",
        copyPlanInstructions: "The table content below has been copied to your clipboard.",
        tableDayHeader: "Day",
        tableMealHeader: "Meal",
        lock: "Lock",
        locked: "Locked",
        unlockDay: "Unlock {day}",
        lockDay: "Lock {day}",
        noDishesAvailable: "No dishes available",
        noDishFound: "No dish found",
        errorKeptLocked: "Error (kept locked)",
        copySuccess: "Table copied to clipboard!",
        copyError: "Could not copy table to clipboard.",
        monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
        scoringMethodLabel: "Meal Selection:",
        scoringRandom: "Random",
        scoringWeighted: "Weighted (Top Preferred)",
        languageLabel: "Language",
        editMealHint: "Double-click to edit", // Added hint text
        sharePlan: "Share Plan", // Added for share button
        shareSuccess: "Shareable link copied to clipboard!",
        shareError: "Failed to create shareable link.",
    },
    no: {
        selectCategories: "Velg kategorier:",
        createNewPlan: "Oppdater plan",
        showCopyTable: "Vis tabell",
        hideCopyTable: "Skjul tabell",
        weeklyPlanTitle: "Ukeplan:",
        copyPlanTitle: "Ukeplan:",
        copyPlanInstructions: "Tabellinnholdet nedenfor er kopiert til utklippstavlen.",
        tableDayHeader: "Dag",
        tableMealHeader: "Middag",
        lock: "Lås",
        locked: "Låst",
        unlockDay: "Lås opp {day}",
        lockDay: "Lås {day}",
        noDishesAvailable: "Ingen retter tilgjengelig",
        noDishFound: "Fant ingen rett",
        errorKeptLocked: "Feil (beholdt låst)",
        copySuccess: "Tabell kopiert til utklippstavlen!",
        copyError: "Kunne ikke kopiere tabell til utklippstavlen.",
        monday: "Mandag", tuesday: "Tirsdag", wednesday: "Onsdag", thursday: "Torsdag", friday: "Fredag", saturday: "Lørdag", sunday: "Søndag",
        scoringMethodLabel: "Måltidsprioritering:",
        scoringRandom: "Tilfeldig",
        scoringWeighted: "Vektet (topp foretrukket)",
        languageLabel: "Språk",
        editMealHint: "Dobbeltklikk for å redigere", // Added hint text
        sharePlan: "Del Plan", // Added for share button
        shareSuccess: "Delbar lenke er kopiert til utklippstavlen!",
        shareError: "Kunne ikke lage delbar lenke.",
    },
    es: {
        selectCategories: "Seleccionar Categorías:",
        createNewPlan: "Crear Nuevo Plan",
        showCopyTable: "Mostrar Tabla Copiable",
        hideCopyTable: "Ocultar Tabla Copiable",
        weeklyPlanTitle: "Plan Semanal:",
        copyPlanTitle: "Plan Semanal Copiable:",
        copyPlanInstructions: "El contenido de la tabla a continuación ha sido copiado al portapapeles.",
        tableDayHeader: "Día",
        tableMealHeader: "Comida",
        lock: "Bloquear",
        locked: "Bloqueado",
        unlockDay: "Desbloquear {day}",
        lockDay: "Bloquear {day}",
        noDishesAvailable: "No hay platos disponibles",
        noDishFound: "No se encontró ningún plato",
        errorKeptLocked: "Error (mantenido bloqueado)",
        copySuccess: "¡Tabla copiada al portapapeles!",
        copyError: "No se pudo copiar la tabla al portapapeles.",
        monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
        scoringMethodLabel: "Selección de Comida:",
        scoringRandom: "Aleatorio",
        scoringWeighted: "Ponderado (Superior Preferido)",
        languageLabel: "Idioma",
        editMealHint: "Doble clic para editar", // Added hint text
        sharePlan: "Compartir Plan", // Added for share button
        shareSuccess: "¡Enlace para compartir copiado al portapapeles!",
        shareError: "Error al crear el enlace para compartir.",
    }
};

const internalDaysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
type ScoringMethod = 'random' | 'weighted';

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// --- Sortable Item Component (with Editing) ---
function SortableMealItem({ item, isLocked, onLockToggle, onMealUpdate, language }: SortableMealItemProps & { language: LanguageKey }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedMeal, setEditedMeal] = useState(item.meal);
    const inputRef = useRef<HTMLInputElement>(null); // Ref for focusing the input

    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: item.id }); // Always draggable

    const style = {
        transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1,
        cursor: 'grab', // Always grab cursor
    };

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Select text for easy replacement
        }
    }, [isEditing]);

    // Translation helper
    const t = (key: keyof typeof translations.en, params?: { [key: string]: string }) => {
        let text = translations[language]?.[key] || translations.en[key] || key;
        if (params) {
            Object.keys(params).forEach(paramKey => {
                text = text.replace(`{${paramKey}}`, params[paramKey]);
            });
        }
        return text;
    };

    // Handlers for editing
    const handleDoubleClick = () => {
        if (!isLocked) { // Only allow editing if not locked
            setEditedMeal(item.meal); // Reset input value to current meal before editing
            setIsEditing(true);
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEditedMeal(event.target.value);
    };

    const handleSave = () => {
        const newMeal = editedMeal; // Keep the raw input value

        // Prevent saving if the input consists only of whitespace or is empty
        if (newMeal.trim() === '') {
            setEditedMeal(item.meal); // Revert to the original meal name
            setIsEditing(false);
            return; // Exit early
        }

        // If the meal has changed (compared to the original), update it
        if (newMeal !== item.meal) {
            onMealUpdate(item.id, newMeal); // Save the potentially untrimmed value
        }

        // Always exit editing mode
        setIsEditing(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent dnd-kit's KeyboardSensor from interfering with spacebar in the input
        if (event.key === ' ') {
            event.stopPropagation();
            return; // Allow default spacebar behavior
        }

        if (event.key === 'Enter') {
            handleSave();
        } else if (event.key === 'Escape') {
            setEditedMeal(item.meal); // Revert changes
            setIsEditing(false);
        }
    };

    // Lock button Aria Label
    const lockAriaLabel = isLocked
        ? t('unlockDay', { day: item.day })
        : t('lockDay', { day: item.day });

    return (
        <li
            ref={setNodeRef} style={style} {...attributes} {...listeners}
            className={`p-3 rounded shadow-sm flex justify-between items-center touch-none ${
                isLocked ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200' // Add hover effect for non-locked
            } transition-colors duration-150`}
        >
            {/* --- Meal Text / Input Area --- */}
            <div className="flex-grow mr-2 text-gray-800" onDoubleClick={handleDoubleClick}>
                <span className="font-semibold">{item.day}:</span>{' '}
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedMeal}
                        onChange={handleInputChange}
                        onBlur={handleSave} // Save when input loses focus
                        onKeyDown={handleKeyDown} // Save on Enter, cancel on Escape
                        className="py-0 px-1 border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        // Prevent drag start when interacting with the input itself
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : (
                    // Show hint only if not locked
                    <span title={!isLocked ? t('editMealHint') : ""}>
                        {item.meal}
                    </span>
                )}
            </div>

            {/* --- Lock Button --- */}
            <button
                onClick={(e) => {
                     e.stopPropagation(); // Prevent drag start on button click
                     onLockToggle(item.id);
                }}
                className={`ml-auto flex-shrink-0 p-1 px-2 rounded text-xs font-medium transition duration-150 ease-in-out ${
                    isLocked
                        ? 'bg-blue-500 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
                aria-label={lockAriaLabel}
            >
                {isLocked ? t('locked') : t('lock')}
            </button>
        </li>
    );
}


// --- Meal Selection Helper Functions --- (Unchanged)
const selectUnweightedRandomMeal = (possibleMeals: string[], usedMeals: Set<string>): string | undefined => {
    const availableMeals = possibleMeals.filter(meal => !usedMeals.has(meal));
    if (availableMeals.length === 0) {
        if (possibleMeals.length === 0) return undefined;
        const randomIndex = Math.floor(Math.random() * possibleMeals.length);
        return possibleMeals[randomIndex];
    }
    const randomIndex = Math.floor(Math.random() * availableMeals.length);
    return availableMeals[randomIndex];
};

const selectWeightedRandomMeal = (possibleMeals: string[], usedMeals: Set<string>): string | undefined => {
    const availableMealsWithWeights: { meal: string, weight: number }[] = [];
    const n = possibleMeals.length;
    for (let i = 0; i < n; i++) {
        const meal = possibleMeals[i];
        if (!usedMeals.has(meal)) {
            availableMealsWithWeights.push({ meal: meal, weight: n - i });
        }
    }
    if (availableMealsWithWeights.length === 0) {
        const allMealsWithWeights: { meal: string, weight: number }[] = possibleMeals.map((meal, i) => ({ meal: meal, weight: n - i }));
        if (allMealsWithWeights.length === 0) return undefined;
        const totalWeightAll = allMealsWithWeights.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeightAll <= 0) return allMealsWithWeights[0]?.meal;
        let randomValueAll = Math.random() * totalWeightAll;
        for (const item of allMealsWithWeights) {
            randomValueAll -= item.weight;
            if (randomValueAll <= 0) return item.meal;
        }
        return allMealsWithWeights[allMealsWithWeights.length - 1]?.meal;
    }
    const totalWeight = availableMealsWithWeights.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return availableMealsWithWeights[0]?.meal;
    let randomValue = Math.random() * totalWeight;
    for (const item of availableMealsWithWeights) {
        randomValue -= item.weight;
        if (randomValue <= 0) return item.meal;
    }
    return availableMealsWithWeights[availableMealsWithWeights.length - 1]?.meal;
};


// --- Main Component ---
export default function MealPlanner({ allCategories, mealsData }: MealPlannerProps) {
    const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanItem[]>([]);
    const [lockedItemIds, setLockedItemIds] = useState<Set<string>>(new Set());
    const [showCopyTable, setShowCopyTable] = useState(false);
    const [language, setLanguage] = useState<LanguageKey>('no');
    const [scoringMethod, setScoringMethod] = useState<ScoringMethod>('random');
    const [recipeId, setRecipeId] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const searchParams = useSearchParams();
    const copyTableRef = useRef<HTMLDivElement>(null);

    // Translation helper
    const t = useCallback((key: keyof typeof translations.en, params?: { [key: string]: string }) => {
        let text = translations[language]?.[key] || translations.en[key] || key;
        if (params) {
            Object.keys(params).forEach(paramKey => {
                text = text.replace(`{${paramKey}}`, params[paramKey]);
            });
        }
        return text;
    }, [language]);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Function to generate the plan
    const generatePlan = useCallback(() => {
        // ... (rest of the function is identical, just ensure it uses the correct `t`)
         const availableCategories = selectedCategories.filter(cat => mealsData[cat]?.length > 0);
         const currentLockedItemsMap = new Map(
             weeklyPlan.filter(item => lockedItemIds.has(item.id)).map(item => [item.id, item])
         );
         const usedMealsThisWeek = new Set<string>(
             Array.from(currentLockedItemsMap.values())
                 .map(item => item.meal)
                 .filter(meal => meal && meal !== t('noDishesAvailable') && meal !== t('noDishFound') && meal !== t('errorKeptLocked'))
         );

         const newPlan: WeeklyPlanItem[] = [];
         const shuffledCategories = [...availableCategories].sort(() => Math.random() - 0.5);
         let categoryIndex = 0;
         const currentDisplayDays = internalDaysOfWeek.map(dayKey => t(dayKey as keyof typeof translations.en));

         for (let i = 0; i < internalDaysOfWeek.length; i++) {
             const currentDayKey = internalDaysOfWeek[i];
             const currentDayDisplay = currentDisplayDays[i];
             const existingItemAtIndex = weeklyPlan[i];
             const potentialLockedId = existingItemAtIndex?.id;
             const isCurrentSlotLocked = potentialLockedId && lockedItemIds.has(potentialLockedId);

             if (isCurrentSlotLocked && existingItemAtIndex) {
                  const lockedItem = currentLockedItemsMap.get(existingItemAtIndex.id);
                  if(lockedItem){
                     newPlan.push({ ...lockedItem, day: currentDayDisplay, dayKey: currentDayKey });
                  } else {
                     newPlan.push({ id: existingItemAtIndex.id, day: currentDayDisplay, dayKey: currentDayKey, meal: t('errorKeptLocked'), category: "-" });
                  }
             } else {
                  let mealMessage = "";
                  let categoryForDay = "-";
                  if (availableCategories.length === 0) {
                      mealMessage = t('noDishesAvailable');
                  } else {
                      categoryForDay = shuffledCategories[categoryIndex % shuffledCategories.length];
                      categoryIndex++;
                      const possibleMeals = mealsData[categoryForDay] || [];
                      let chosenMeal: string | undefined = undefined;

                      if (possibleMeals.length > 0) {
                          if (scoringMethod === 'weighted') {
                              chosenMeal = selectWeightedRandomMeal(possibleMeals, usedMealsThisWeek);
                          } else {
                              chosenMeal = selectUnweightedRandomMeal(possibleMeals, usedMealsThisWeek);
                          }
                      }

                      if (chosenMeal) {
                          mealMessage = chosenMeal;
                          usedMealsThisWeek.add(chosenMeal);
                      } else {
                          mealMessage = t('noDishFound');
                      }
                  }
                   newPlan.push({
                       id: uuidv4(),
                       day: currentDayDisplay,
                       dayKey: currentDayKey,
                       meal: mealMessage,
                       category: categoryForDay
                   });
              }
         }
         setWeeklyPlan(newPlan);
     }, [selectedCategories, mealsData, lockedItemIds, weeklyPlan, t, scoringMethod]);

    // Effect for initial load from URL or new plan generation
    useEffect(() => {
        const idFromUrl = searchParams.get('recipeId');
        if (idFromUrl) {
            setRecipeId(idFromUrl);
            const loadRecipe = async () => {
                try {
                    const response = await fetch(`/api/recipe?id=${idFromUrl}`);
                    if (response.ok) {
                        const data = await response.json() as SavedPlanState;
                        setWeeklyPlan(data.weeklyPlan || []);
                        setLockedItemIds(new Set(data.lockedItemIds || []));
                        setSelectedCategories(data.selectedCategories || allCategories);
                        setLanguage(data.language || 'no');
                        setScoringMethod(data.scoringMethod || 'random');
                    } else {
                        console.error('Failed to load recipe, generating a new plan.');
                        generatePlan();
                    }
                } catch (error) {
                    console.error('Error loading recipe:', error);
                    generatePlan();
                }
            };
            loadRecipe();
        } else {
            generatePlan();
        }
        setIsInitialLoad(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]); // Only run on initial load and when URL params change

    // Debounce state for autosaving
    const debouncedState = useDebounce({ weeklyPlan, lockedItemIds: Array.from(lockedItemIds), selectedCategories, language, scoringMethod }, 1000);

    // Effect for autosaving changes to the backend
    useEffect(() => {
        if (isInitialLoad || !recipeId) {
            return; // Don't save on initial load or if there's no recipe ID
        }

        const saveRecipe = async () => {
            try {
                await fetch(`/api/recipe?id=${recipeId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(debouncedState),
                });
            } catch (error) {
                console.error('Error saving recipe:', error);
            }
        };

        saveRecipe();
    }, [debouncedState, recipeId, isInitialLoad]);

    // Handler for sharing/saving the plan
    const handleShare = async () => {
        const stateToSave = {
            weeklyPlan,
            lockedItemIds: Array.from(lockedItemIds),
            selectedCategories,
            language,
            scoringMethod,
        };

        try {
            const response = await fetch('/api/recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            });

            if (response.ok) {
                const { id } = await response.json() as { id: string };
                setRecipeId(id);
                const newUrl = `${window.location.origin}${window.location.pathname}?recipeId=${id}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                navigator.clipboard.writeText(newUrl);
                alert(t('shareSuccess'));
            } else {
                alert(t('shareError'));
            }
        } catch (error) {
            console.error('Error sharing recipe:', error);
            alert(t('shareError'));
        }
    };

    // Clipboard Copy Logic
    const copyTableToClipboard = useCallback(async (plan: WeeklyPlanItem[]) => {
        if (!navigator.clipboard) {
            console.error("Clipboard API not available.");
            alert(t('copyError'));
            return;
        }
        const textToCopy = plan.map(item => `${item.day}: ${item.meal}`).join('\n');
        try {
            await navigator.clipboard.writeText(textToCopy);
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert(t('copyError'));
        }
    }, [t]);

    useEffect(() => {
        if (showCopyTable && weeklyPlan.length > 0) {
            copyTableToClipboard(weeklyPlan);
        }
    }, [showCopyTable, weeklyPlan, copyTableToClipboard]);

    // Handler for Category Toggle
    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    // Handler for Lock Toggle
    const handleLockToggle = (id: string) => {
        setLockedItemIds(prevLockedIds => {
            const newLockedIds = new Set(prevLockedIds);
            if (newLockedIds.has(id)) {
                newLockedIds.delete(id);
            } else {
                newLockedIds.add(id);
            }
            return newLockedIds;
        });
    };

    // Handler for Manual Meal Update
    const handleMealUpdate = useCallback((id: string, newMeal: string) => {
        setWeeklyPlan(currentPlan =>
            currentPlan.map(item =>
                item.id === id ? { ...item, meal: newMeal, category: 'Manual' } : item
            )
        );
    }, []);

    // Handler for Drag End
    const handleDragEnd = (event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
              const activeId = active.id as string;
              const overId = over.id as string;

              setWeeklyPlan((items) => {
                  const oldIndex = items.findIndex(item => item.id === activeId);
                  const newIndex = items.findIndex(item => item.id === overId);
                  if (oldIndex === -1 || newIndex === -1) return items;

                  const reorderedItems = arrayMove(items, oldIndex, newIndex);
                  const currentDisplayDays = internalDaysOfWeek.map(dayKey => t(dayKey as keyof typeof translations.en));

                  return reorderedItems.map((item, index) => ({
                      ...item,
                      day: currentDisplayDays[index],
                      dayKey: internalDaysOfWeek[index]
                  }));
              });
          }
     };

    // --- JSX Rendering ---
    return (
        <div className="relative p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Language Selector */}
            <div className="absolute top-4 right-4 z-10">
                 <label htmlFor="language-select" className="sr-only">{t('languageLabel')}</label>
                 <select
                     id="language-select"
                     value={language}
                     onChange={(e) => setLanguage(e.target.value as LanguageKey)}
                     className="text-sm bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 hover:border-gray-400 transition duration-150 ease-in-out"
                     aria-label={t('languageLabel')}
                 >
                     {(Object.keys(languages) as LanguageKey[]).map(langKey => (
                         <option key={langKey} value={langKey}>
                             {languages[langKey]}
                         </option>
                     ))}
                 </select>
             </div>

            {/* Main Content Area */}
            <div className="flex flex-col md:flex-row gap-8 mt-16">
                {/* Left column: Controls */}
                <div className="w-full md:w-1/4 space-y-6">
                    {/* Category Selection */}
                    <div>
                         <h2 className="text-lg font-semibold mb-2 text-gray-700">{t('selectCategories')}</h2>
                         <div className="space-y-1 bg-white p-3 rounded shadow-sm border border-gray-200">
                             {allCategories.map(category => (
                                 <div key={category} className="flex items-center">
                                     <input
                                         type="checkbox"
                                         id={`cat-${category}`}
                                         checked={selectedCategories.includes(category)}
                                         onChange={() => handleCategoryToggle(category)}
                                         className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                     />
                                     <label htmlFor={`cat-${category}`} className="text-sm text-gray-700 cursor-pointer">{category}</label>
                                 </div>
                             ))}
                         </div>
                    </div>

                    {/* Scoring Method Selector */}
                     <div>
                         <label htmlFor="scoring-method-select" className="block text-sm font-medium text-gray-700 mb-1">
                             {t('scoringMethodLabel')}
                         </label>
                         <select
                             id="scoring-method-select"
                             value={scoringMethod}
                             onChange={(e) => setScoringMethod(e.target.value as ScoringMethod)}
                             className="w-full text-sm bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 hover:border-gray-400 transition duration-150 ease-in-out"
                         >
                             <option value="random">{t('scoringRandom')}</option>
                             <option value="weighted">{t('scoringWeighted')}</option>
                         </select>
                     </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                         <button
                             onClick={generatePlan}
                             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                         >
                             {t('createNewPlan')}
                         </button>
                         <button
                             onClick={() => setShowCopyTable(prev => !prev)}
                             className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out shadow focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                         >
                             {showCopyTable ? t('hideCopyTable') : t('showCopyTable')}
                         </button>
                         <button
                             onClick={handleShare}
                             className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                         >
                             {t('sharePlan')}
                         </button>
                    </div>
                </div>

                {/* Right column: Weekly plan */}
                <div className="w-full md:w-3/4">
                    <h2 className="text-lg font-semibold mb-2 text-gray-700">{t('weeklyPlanTitle')}</h2>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={weeklyPlan.map(item => item.id)} strategy={verticalListSortingStrategy}>
                            <ul className="space-y-2">
                                {weeklyPlan.map(item => (
                                    <SortableMealItem
                                        key={item.id}
                                        item={item}
                                        isLocked={lockedItemIds.has(item.id)}
                                        onLockToggle={handleLockToggle}
                                        onMealUpdate={handleMealUpdate}
                                        language={language}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Copy-friendly List */}
            {showCopyTable && (
                <div ref={copyTableRef} className="mt-8 p-4 border border-gray-300 rounded bg-white text-gray-800 shadow-md">
                    <h3 className="text-lg font-semibold mb-2">{t('copyPlanTitle')}</h3>
                    <p className="text-sm text-gray-600 mb-3">{t('copyPlanInstructions')}</p>
                    <pre className="text-sm whitespace-pre-wrap break-words">
                        {weeklyPlan.map(item => (
                            <div key={item.id + '-copy'}>
                                {item.day}: {item.meal}
                            </div>
                        ))}
                    </pre>
                </div>
            )}
	    </div>
    );
}
