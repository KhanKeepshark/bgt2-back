import { DaySumModel } from "../models/operation-chart-data.model";

// Функция для вычисления оптимального размера группы
export const calculateGroupSize = (daysCount: number): number => {
    if (daysCount <= 31) return 1;
    return Math.ceil(daysCount / 31);
};

// Функция для группировки дней с заданным размером группы по последовательным календарным дням
export const groupDays = (
    daysData: Record<string, number>,
    groupSize: number,
): DaySumModel[] => {
    const sortedDays = Object.keys(daysData).sort();
    const grouped: DaySumModel[] = [];

    if (sortedDays.length === 0) {
        return grouped;
    }

    let currentGroup: string[] = [];
    let lastDate: Date | null = null;

    for (const day of sortedDays) {
        const currentDate = new Date(day + 'T00:00:00');
        
        // Проверяем, является ли текущая дата следующим календарным днем после последней
        let isNextDay = false;
        if (lastDate === null) {
        isNextDay = true;
        } else {
        const expectedNextDay = new Date(lastDate);
        expectedNextDay.setDate(expectedNextDay.getDate() + 1);
        // Сравниваем только даты (без времени)
        isNextDay = 
            currentDate.getFullYear() === expectedNextDay.getFullYear() &&
            currentDate.getMonth() === expectedNextDay.getMonth() &&
            currentDate.getDate() === expectedNextDay.getDate();
        }

        // Если группа заполнена или есть пропуск в датах, начинаем новую группу
        if (currentGroup.length >= groupSize || (!isNextDay && currentGroup.length > 0)) {
        // Сохраняем текущую группу
        const groupSum = currentGroup.reduce(
            (sum, d) => sum + daysData[d],
            0,
        );
        grouped.push({
            key: currentGroup[0],
            value: groupSum.toString(),
        });
        // Начинаем новую группу
        currentGroup = [];
        }

        // Добавляем текущую дату в группу
        currentGroup.push(day);
        lastDate = currentDate;
    }

    // Добавляем последнюю группу, если она не пустая
    if (currentGroup.length > 0) {
        const groupSum = currentGroup.reduce(
        (sum, d) => sum + daysData[d],
        0,
        );
        grouped.push({
        key: currentGroup[0],
        value: groupSum.toString(),
        });
    }

    return grouped;
};