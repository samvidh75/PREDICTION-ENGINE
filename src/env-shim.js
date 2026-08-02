/**
 * Robust Shim for Node.js globals in the browser.
 * Prevents "ReferenceError: process is not defined" and "global is not defined".
 */
if (typeof window !== 'undefined') {
    // Ensure 'global' points to window
    window.global = window.global || window;

    // Ensure 'process' exists with minimal required properties
    window.process = window.process || {
        env: { NODE_ENV: 'development' },
        version: '',
        platform: 'browser',
        nextTick: (fn) => setTimeout(fn, 0),
        stdout: { fd: 1, write: () => {}, on: () => {} },
        stderr: { fd: 2, write: () => {}, on: () => {} },
        stdin: { fd: 0, on: () => {} },
        cwd: () => '/',
        browser: true,
        exit: () => {},
        argv: ['node'],
        binding: () => ({})
    };
}