export const TIME_SLOTS: string[] = (() => {
    const slots = [];
    for (let hour = 9; hour < 19; hour++) {
        slots.push(`${String(hour).padStart(2, '0')}:00`);
        if (hour !== 18) { // Don't add 18:30 if shop closes at 19:00
             slots.push(`${String(hour).padStart(2, '0')}:30`);
        }
    }
    return slots;
})();

export const LUNCH_BREAK_SLOTS: string[] = ['12:00', '12:30'];