/**
 * Maps route paths to module names used in the database/Roles & Permissions matrix.
 */
export const PATH_TO_MODULE_MAPPING: Record<string, string> = {
    '/admin/dashboard': 'Dashboard (Admin)',
    '/admin/users/list': 'User List',
    '/admin/users/roles': 'Roles & Permissions',
    '/admin/branches': 'Branches',
    '/admin/logs': 'Action Logs',
    
    '/dashboard': 'Dashboard (HR)',
    '/employees': 'Employee List',
    '/structure': 'Company Structure',
    '/benefits': 'Benefits',
    '/holidays': 'Holidays',
    '/compensation': 'Compensation',
    '/payroll': 'Payroll',
    
    '/attendance': 'Daily Attendance',
    '/dtr': 'Daily Time Record (HR)',
    '/schedule': 'Schedules',
    '/requests': 'Time Requests',
    
    '/accounting/dashboard': 'Dashboard (Accounting)',
    '/accounting/finance': 'Finance',
    
    '/ess/dashboard': 'My ESS Portal'
};

/**
 * Normalizes a pathname to its corresponding module name for permission checking.
 */
export function getModuleName(pathname: string): string | null {
    // Exact match trial
    if (PATH_TO_MODULE_MAPPING[pathname]) {
        return PATH_TO_MODULE_MAPPING[pathname];
    }

    // Try finding the closest parent path that matches
    const paths = Object.keys(PATH_TO_MODULE_MAPPING).sort((a, b) => b.length - a.length);
    for (const path of paths) {
        if (pathname.startsWith(path)) {
            return PATH_TO_MODULE_MAPPING[path];
        }
    }

    return null;
}
