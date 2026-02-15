import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { Clock, ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';

/**
 * TripRangeCalendar - A custom calendar component for selecting trip date ranges
 * Features:
 * - Range selection (click start date, then end date)
 * - Highlights busy dates in red (disabled)
 * - Highlights selected range in amber
 * - Includes time selection for start and end
 */
export default function TripRangeCalendar({
    startDateTime,
    endDateTime,
    onChange,
    busyDates = [],
    minDate = null,
    error = null,
    hideTimeSelection = false
}) {
    const [rangeStart, setRangeStart] = useState(startDateTime ? dayjs(startDateTime) : null);
    const [rangeEnd, setRangeEnd] = useState(endDateTime ? dayjs(endDateTime) : null);
    const [startTime, setStartTime] = useState(startDateTime ? dayjs(startDateTime).format('HH:mm') : '09:00');
    const [endTime, setEndTime] = useState(endDateTime ? dayjs(endDateTime).format('HH:mm') : '18:00');
    const [selectingEnd, setSelectingEnd] = useState(false);

    // Convert busy dates to dayjs objects for easier comparison
    const busyDateRanges = busyDates.map(range => ({
        start: dayjs(range.start),
        end: dayjs(range.end),
        type: range.type
    }));

    // Check if a date is within any busy range
    const isDateBusy = (date) => {
        return busyDateRanges.some(range => {
            const d = dayjs(date);
            return d.isSame(range.start, 'day') ||
                d.isSame(range.end, 'day') ||
                (d.isAfter(range.start, 'day') && d.isBefore(range.end, 'day'));
        });
    };

    // Check if a date is in the selected range
    const isInSelectedRange = (date) => {
        if (!rangeStart || !rangeEnd) return false;
        const d = dayjs(date);
        return (d.isSame(rangeStart, 'day') || d.isSame(rangeEnd, 'day') ||
            (d.isAfter(rangeStart, 'day') && d.isBefore(rangeEnd, 'day')));
    };

    // Check if range contains any busy dates
    const rangeContainsBusyDates = (start, end) => {
        return busyDateRanges.some(range => {
            // Check if busy range overlaps with selected range
            return !(end.isBefore(range.start, 'day') || start.isAfter(range.end, 'day'));
        });
    };

    const handleDateClick = (date) => {
        const clickedDate = dayjs(date);

        // Don't allow selecting busy dates
        if (isDateBusy(clickedDate)) {
            return;
        }

        if (!selectingEnd) {
            // First click - set start date
            setRangeStart(clickedDate);
            setRangeEnd(null);
            setSelectingEnd(true);
        } else {
            // Second click - set end date
            if (clickedDate.isBefore(rangeStart, 'day')) {
                // If clicked date is before start, swap them
                setRangeEnd(rangeStart);
                setRangeStart(clickedDate);
            } else {
                setRangeEnd(clickedDate);
            }

            // Check if range contains busy dates
            const start = clickedDate.isBefore(rangeStart) ? clickedDate : rangeStart;
            const end = clickedDate.isBefore(rangeStart) ? rangeStart : clickedDate;

            if (rangeContainsBusyDates(start, end)) {
                // Reset selection if range contains busy dates
                setRangeStart(null);
                setRangeEnd(null);
                setSelectingEnd(false);
                return;
            }

            setSelectingEnd(false);
        }
    };

    // Update parent component when dates or times change
    useEffect(() => {
        if (rangeStart && rangeEnd && startTime && endTime) {
            const [startHour, startMin] = startTime.split(':');
            const [endHour, endMin] = endTime.split(':');

            const start = rangeStart.hour(parseInt(startHour)).minute(parseInt(startMin)).second(0);
            const end = rangeEnd.hour(parseInt(endHour)).minute(parseInt(endMin)).second(0);

            onChange({
                startDateTime: start.toISOString(),
                endDateTime: end.toISOString()
            });
        }
    }, [rangeStart, rangeEnd, startTime, endTime]);

    // Custom day component for MUI DateCalendar
    const CustomDay = (props) => {
        const { day, ...other } = props;
        const isBusy = isDateBusy(day);

        // Define range states
        const start = rangeStart ? dayjs(rangeStart).startOf('day') : null;
        const end = rangeEnd ? dayjs(rangeEnd).startOf('day') : null;
        const current = dayjs(day).startOf('day');

        const isStart = start && current.isSame(start);
        const isEnd = end && current.isSame(end);
        const isInRange = start && end && current.isAfter(start) && current.isBefore(end);
        const isSelected = isStart || isEnd || isInRange;

        return (
            <div
                style={{
                    position: 'relative',
                    backgroundColor: isInRange ? '#fef3c7' : (isStart && end) ? 'transparent' : (isEnd && start) ? 'transparent' : 'transparent',
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Background bar for range connecting */}
                {isSelected && start && end && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: isStart ? '50%' : 0,
                            right: isEnd ? '50%' : 0,
                            backgroundColor: '#fef3c7',
                            zIndex: 0
                        }}
                    />
                )}

                <PickersDay
                    {...other}
                    day={day}
                    disabled={isBusy || other.disabled}
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        backgroundColor: isBusy ? '#ef4444 !important' :
                            (isStart || isEnd) ? '#f59e0b !important' : 'transparent',
                        color: (isBusy || isStart || isEnd) ? 'white !important' :
                            isInRange ? '#92400e !important' : 'inherit',
                        borderRadius: (isStart || isEnd || isBusy) ? '50% !important' : '0',
                        margin: 0,
                        border: 'none !important',
                        '&:hover': {
                            backgroundColor: isBusy ? '#dc2626 !important' :
                                (isStart || isEnd) ? '#d97706 !important' :
                                    isInRange ? '#fde68a !important' : undefined
                        },
                        fontWeight: (isStart || isEnd) ? 'bold' : 'normal',
                        '&.Mui-selected': {
                            backgroundColor: (isStart || isEnd) ? '#f59e0b !important' : 'transparent',
                            color: (isStart || isEnd) ? 'white !important' : 'inherit',
                        },
                        // Overriding system focus/outline
                        '&.Mui-focusVisible': {
                            outline: 'none',
                            backgroundColor: (isStart || isEnd) ? '#d97706 !important' : 'transparent',
                        },
                        '&.MuiPickersDay-today': {
                            borderColor: 'transparent !important',
                            borderWidth: '0px !important'
                        }
                    }}
                />
            </div>
        );
    };

    const handleClearSelection = () => {
        setRangeStart(null);
        setRangeEnd(null);
        setSelectingEnd(false);
    };

    return (
        <div className="space-y-4">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative">
                    {/* Header: Instructions and Reset Button */}
                    <div className="flex justify-between items-start mb-4 min-h-[40px]">
                        <div className="text-xs flex-1">
                            {rangeStart && rangeEnd ? (
                                <p className="flex items-center gap-2 text-gray-700 font-medium">
                                    <CalendarIcon className="text-amber-500" size={20} />
                                    Selected Dates <span className="text-amber-500 ml-1">
                                        {rangeStart.format('MMM D, YYYY')} → {rangeEnd.format('MMM D, YYYY')}
                                    </span>
                                </p>
                            ) : !selectingEnd ? (
                                <p className="flex items-center gap-2 text-gray-700 font-medium">
                                    <CalendarIcon className="text-amber-500" size={20} />
                                    Click to select <span className="text-amber-500">start date</span>
                                </p>
                            ) : (
                                <p className="flex items-center gap-2 text-gray-700 font-medium">
                                    <CalendarIcon className="text-amber-500" size={20} />
                                    Click to select <span className="text-amber-500">end date</span>
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleClearSelection}
                            className="flex items-center gap-2 px-4 py-1.5 border border-amber-500 text-amber-600 rounded-full text-sm font-medium hover:bg-amber-50 transition-colors whitespace-nowrap"
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>

                    {/* Calendar */}
                    <DateCalendar
                        value={rangeStart}
                        onChange={handleDateClick}
                        disableHighlightToday
                        minDate={rangeStart && selectingEnd ? rangeStart : (minDate ? dayjs(minDate) : dayjs())}
                        slots={{
                            day: CustomDay,
                            leftArrowIcon: () => <ChevronLeft size={20} />,
                            rightArrowIcon: () => <ChevronRight size={20} />
                        }}
                        sx={{
                            width: '100%',
                            '& .MuiPickersCalendarHeader-root': {
                                paddingLeft: '0',
                                paddingRight: '0',
                                marginBottom: '10px'
                            },
                            '& .MuiPickersCalendarHeader-label': {
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: '#111827'
                            },
                            '& .MuiDayCalendar-header': {
                                justifyContent: 'space-between',
                                marginBottom: '10px'
                            },
                            '& .MuiDayCalendar-weekDayLabel': {
                                color: '#6b7280',
                                fontWeight: '600',
                                width: '40px'
                            },
                            '& .MuiDayCalendar-monthContainer': {
                                minHeight: '240px'
                            },
                            '& .MuiPickersDay-root': {
                                width: '40px',
                                height: '40px',
                                fontSize: '0.95rem'
                            }
                        }}
                    />

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-xs mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            <span className="text-gray-600 font-medium whitespace-nowrap">Busy (Unavailable)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-amber-500"></div>
                            <span className="text-gray-600 font-medium whitespace-nowrap">Selected Range</span>
                        </div>
                    </div>
                </div>
            </LocalizationProvider>

            {/* Time Selection */}
            {!hideTimeSelection && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-amber-600" />
                        Select Times
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
