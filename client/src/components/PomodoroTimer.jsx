import React, { useState, useEffect, useRef, useCallback } from "react";

const PomodoroTimer = ({ showMessage }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState("work"); // 'work', 'short-break', 'long-break'
  const timerRef = useRef(null);

  // Constants for default times (in seconds)
  const WORK_TIME = 25 * 60;
  const SHORT_BREAK_TIME = 5 * 60;
  const LONG_BREAK_TIME = 15 * 60;

  const [remainingTime, setRemainingTime] = useState(WORK_TIME);

  // Refs for the editable minutes and seconds spans
  const minutesRef = useRef(null);
  const secondsRef = useRef(null);

  // State to track if minutes or seconds are being edited
  const [editingField, setEditingField] = useState(null); // 'minutes' or 'seconds'

  const resetTimer = useCallback(
    (newMode) => {
      setIsActive(false);
      setMode(newMode);
      let time = WORK_TIME; // Default to work time
      if (newMode === "short-break") {
        time = SHORT_BREAK_TIME;
      } else if (newMode === "long-break") {
        time = LONG_BREAK_TIME;
      }
      setRemainingTime(time);
      setMinutes(Math.floor(time / 60));
      setSeconds(time % 60);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [WORK_TIME, SHORT_BREAK_TIME, LONG_BREAK_TIME]
  ); // Add dependencies to useCallback

  useEffect(() => {
    // Timer interval logic
    if (isActive && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (remainingTime === 0 && isActive) {
      // Ensure it only triggers if timer was active
      clearInterval(timerRef.current);
      setIsActive(false);
      showMessage(`${mode.toUpperCase()} session ended!`, "success");

      // Cycle modes
      if (mode === "work") {
        resetTimer("short-break");
      } else if (mode === "short-break") {
        resetTimer("work"); // Cycle back to work after short break
      } else if (mode === "long-break") {
        resetTimer("work"); // Cycle back to work after long break
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, remainingTime, mode, showMessage, resetTimer]); // Added resetTimer to dependencies

  // Update minutes and seconds display from remainingTime
  useEffect(() => {
    setMinutes(Math.floor(remainingTime / 60));
    setSeconds(remainingTime % 60);
  }, [remainingTime]);

  // Handle direct editing of minutes/seconds
  const handleEditFocus = (field) => {
    setIsActive(false); // Pause timer when editing
    setEditingField(field);
  };

  const handleEditBlur = (e, field) => {
    const value = parseInt(e.target.innerText, 10);
    if (isNaN(value) || value < 0) {
      showMessage("Please enter a valid positive number.", "error");
      // Revert to previous value or set to a default
      if (field === "minutes")
        e.target.innerText = String(minutes).padStart(2, "0");
      else e.target.innerText = String(seconds).padStart(2, "0");
      setEditingField(null); // Exit editing even on error
      return;
    }

    if (field === "minutes") {
      setMinutes(value);
      setRemainingTime(value * 60 + seconds);
    } else if (field === "seconds") {
      // Seconds should not exceed 59
      const newSeconds = Math.min(value, 59);
      setSeconds(newSeconds);
      setRemainingTime(minutes * 60 + newSeconds);
      e.target.innerText = String(newSeconds).padStart(2, "0"); // Update display if capped
    }
    setEditingField(null); // Exit edit mode
  };

  // === MODIFIED handleKeyDown function ===
  const handleKeyDown = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent new line
      e.target.blur(); // Trigger onBlur to save
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); // Prevent page scroll
      let newValue;
      if (field === "minutes") {
        newValue = Math.min(minutes + 1, 99); // Cap minutes at 99
        setMinutes(newValue);
        setRemainingTime(newValue * 60 + seconds);
        minutesRef.current.innerText = String(newValue).padStart(2, "0");
      } else if (field === "seconds") {
        newValue = (seconds + 1) % 60; // Cycle 0-59
        setSeconds(newValue);
        setRemainingTime(minutes * 60 + newValue);
        secondsRef.current.innerText = String(newValue).padStart(2, "0");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault(); // Prevent page scroll
      let newValue;
      if (field === "minutes") {
        newValue = Math.max(minutes - 1, 0); // Min minutes at 0
        setMinutes(newValue);
        setRemainingTime(newValue * 60 + seconds);
        minutesRef.current.innerText = String(newValue).padStart(2, "0");
      } else if (field === "seconds") {
        newValue = (seconds - 1 + 60) % 60; // Cycle 59-0
        setSeconds(newValue);
        setRemainingTime(minutes * 60 + newValue);
        secondsRef.current.innerText = String(newValue).padStart(2, "0");
      }
    } else if (
      !/[0-9]/.test(e.key) &&
      e.key !== "Backspace" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight"
    ) {
      // Allow numbers, backspace, and arrow keys (excluding up/down now handled above)
      e.preventDefault();
    }
  };
  // === END MODIFIED handleKeyDown function ===

  const handleWheel = (e, field) => {
    e.preventDefault(); // Prevent page scroll

    let newValue;
    if (field === "minutes") {
      newValue = minutes;
      if (e.deltaY < 0) {
        // Scroll up
        newValue = Math.min(newValue + 1, 99); // Cap minutes at 99
      } else {
        // Scroll down
        newValue = Math.max(newValue - 1, 0); // Min minutes at 0
      }
      setMinutes(newValue);
      setRemainingTime(newValue * 60 + seconds);
      minutesRef.current.innerText = String(newValue).padStart(2, "0");
    } else if (field === "seconds") {
      newValue = seconds;
      if (e.deltaY < 0) {
        // Scroll up
        newValue = (newValue + 1) % 60; // Cycle 0-59
      } else {
        // Scroll down
        newValue = (newValue - 1 + 60) % 60; // Cycle 59-0
      }
      setSeconds(newValue);
      setRemainingTime(minutes * 60 + newValue);
      secondsRef.current.innerText = String(newValue).padStart(2, "0");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 text-center transition-colors duration-300">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Pomodoro Timer
      </h3>

      {/* Mode selection buttons */}
      <div className="flex justify-center space-x-2 mb-4">
        <button
          onClick={() => resetTimer("work")}
          className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors duration-200
                      ${
                        mode === "work"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                      }`}
        >
          Work ({Math.floor(WORK_TIME / 60)} min)
        </button>
        <button
          onClick={() => resetTimer("short-break")}
          className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors duration-200
                      ${
                        mode === "short-break"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                      }`}
        >
          Short Break ({Math.floor(SHORT_BREAK_TIME / 60)} min)
        </button>
        <button
          onClick={() => resetTimer("long-break")}
          className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors duration-200
                      ${
                        mode === "long-break"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                      }`}
        >
          Long Break ({Math.floor(LONG_BREAK_TIME / 60)} min)
        </button>
      </div>

      {/* Timer Display - now editable with contentEditable */}
      <div className="text-6xl font-bold mb-4 text-gray-900 dark:text-white flex justify-center items-center">
        <span
          ref={minutesRef}
          contentEditable={!isActive} // Allow editing only when timer is not active
          suppressContentEditableWarning={true} // Suppress React warning
          onFocus={() => handleEditFocus("minutes")}
          onBlur={(e) => handleEditBlur(e, "minutes")}
          onKeyDown={(e) => handleKeyDown(e, "minutes")} // Use the modified handler
          onWheel={(e) => handleWheel(e, "minutes")}
          className={`px-2 rounded-md ${
            editingField === "minutes"
              ? "bg-blue-200 dark:bg-blue-700 outline-none"
              : ""
          }`}
          style={{ minWidth: "80px", textAlign: "right" }} // Helps maintain layout
        >
          {String(minutes).padStart(2, "0")}
        </span>
        <span>:</span>
        <span
          ref={secondsRef}
          contentEditable={!isActive} // Allow editing only when timer is not active
          suppressContentEditableWarning={true}
          onFocus={() => handleEditFocus("seconds")}
          onBlur={(e) => handleEditBlur(e, "seconds")}
          onKeyDown={(e) => handleKeyDown(e, "seconds")} // Use the modified handler
          onWheel={(e) => handleWheel(e, "seconds")}
          className={`px-2 rounded-md ${
            editingField === "seconds"
              ? "bg-blue-200 dark:bg-blue-700 outline-none"
              : ""
          }`}
          style={{ minWidth: "80px", textAlign: "left" }} // Helps maintain layout
        >
          {String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* Control Buttons (Start, Pause, Reset) */}
      <div className="space-x-4">
        <button
          onClick={() => setIsActive(true)}
          disabled={isActive || editingField !== null} // Disable if active or editing
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors duration-200"
        >
          Start
        </button>
        <button
          onClick={() => setIsActive(false)}
          disabled={!isActive}
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors duration-200"
        >
          Pause
        </button>
        <button
          onClick={() => resetTimer(mode)} // Reset to the current mode's time
          disabled={editingField !== null} // Disable if editing
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
