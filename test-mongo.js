"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("./lib/prisma");
function testDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var branch, fetchedBranch, role, fetchedRole, user, fetchedUser, employee, fetchedEmp, e_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('Testing CRUD operations and relations for MongoDB migration...');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 19, , 20]);
                    // --- 1. Branch CRUD ---
                    console.log('\n--- branch ---');
                    return [4 /*yield*/, prisma_1.prisma.branch.create({
                            data: {
                                name: 'Main HQ',
                                location: 'Downtown',
                                status: 'active'
                            }
                        })];
                case 2:
                    branch = _c.sent();
                    console.log('Created branch:', branch.id);
                    return [4 /*yield*/, prisma_1.prisma.branch.findUnique({ where: { id: branch.id } })];
                case 3:
                    fetchedBranch = _c.sent();
                    console.log('Read branch:', fetchedBranch === null || fetchedBranch === void 0 ? void 0 : fetchedBranch.name);
                    return [4 /*yield*/, prisma_1.prisma.branch.update({
                            where: { id: branch.id },
                            data: { location: 'Uptown' }
                        })];
                case 4:
                    fetchedBranch = _c.sent();
                    console.log('Updated branch location:', fetchedBranch === null || fetchedBranch === void 0 ? void 0 : fetchedBranch.location);
                    // --- 2. Role CRUD ---
                    console.log('\n--- role ---');
                    return [4 /*yield*/, prisma_1.prisma.role.create({
                            data: {
                                name: 'Test Admin Role',
                                description: 'Super user',
                                permissions: {
                                    create: [
                                        { module: 'User Settings', canView: true, canEdit: true, canCreate: true, canDelete: true }
                                    ]
                                }
                            }
                        })];
                case 5:
                    role = _c.sent();
                    console.log('Created role:', role.id);
                    return [4 /*yield*/, prisma_1.prisma.role.findUnique({ where: { id: role.id }, include: { permissions: true } })];
                case 6:
                    fetchedRole = _c.sent();
                    console.log('Read role:', fetchedRole === null || fetchedRole === void 0 ? void 0 : fetchedRole.name, 'Permissions count:', fetchedRole === null || fetchedRole === void 0 ? void 0 : fetchedRole.permissions.length);
                    return [4 /*yield*/, prisma_1.prisma.role.update({
                            where: { id: role.id },
                            data: { description: 'Updated Admin' },
                            include: { permissions: true }
                        })];
                case 7:
                    fetchedRole = _c.sent();
                    console.log('Updated role description:', fetchedRole === null || fetchedRole === void 0 ? void 0 : fetchedRole.description);
                    // --- 3. User CRUD (with relations) ---
                    console.log('\n--- user ---');
                    return [4 /*yield*/, prisma_1.prisma.user.create({
                            data: {
                                email: 'testadmin@example.com',
                                username: 'admin1',
                                password: 'password123',
                                roleId: role.id,
                                branchId: branch.id
                            }
                        })];
                case 8:
                    user = _c.sent();
                    console.log('Created user:', user.id);
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({ where: { id: user.id }, include: { role: true, branch: true } })];
                case 9:
                    fetchedUser = _c.sent();
                    console.log('Read user (relations check):', fetchedUser === null || fetchedUser === void 0 ? void 0 : fetchedUser.username, 'Role:', fetchedUser === null || fetchedUser === void 0 ? void 0 : fetchedUser.role.name, 'Branch:', (_a = fetchedUser === null || fetchedUser === void 0 ? void 0 : fetchedUser.branch) === null || _a === void 0 ? void 0 : _a.name);
                    return [4 /*yield*/, prisma_1.prisma.user.update({
                            where: { id: user.id },
                            data: { username: 'superadmin1' },
                            include: { role: true, branch: true }
                        })];
                case 10:
                    fetchedUser = _c.sent();
                    console.log('Updated user:', fetchedUser === null || fetchedUser === void 0 ? void 0 : fetchedUser.username);
                    // --- 4. Employee CRUD (with relations) ---
                    console.log('\n--- employee ---');
                    return [4 /*yield*/, prisma_1.prisma.employee.create({
                            data: {
                                firstName: 'John',
                                lastName: 'Doe',
                                email: 'johndoe@example.com',
                                department: 'IT',
                                position: 'Developer',
                                branchId: branch.id
                            }
                        })];
                case 11:
                    employee = _c.sent();
                    console.log('Created employee:', employee.id);
                    return [4 /*yield*/, prisma_1.prisma.employee.findUnique({ where: { id: employee.id }, include: { branch: true } })];
                case 12:
                    fetchedEmp = _c.sent();
                    console.log('Read employee:', fetchedEmp === null || fetchedEmp === void 0 ? void 0 : fetchedEmp.firstName, fetchedEmp === null || fetchedEmp === void 0 ? void 0 : fetchedEmp.lastName, 'Branch:', (_b = fetchedEmp === null || fetchedEmp === void 0 ? void 0 : fetchedEmp.branch) === null || _b === void 0 ? void 0 : _b.name);
                    return [4 /*yield*/, prisma_1.prisma.employee.update({
                            where: { id: employee.id },
                            data: { position: 'Senior Developer' },
                            include: { branch: true }
                        })];
                case 13:
                    fetchedEmp = _c.sent();
                    console.log('Updated employee position:', fetchedEmp === null || fetchedEmp === void 0 ? void 0 : fetchedEmp.position);
                    // --- 5. Clean up (Deletes) ---
                    console.log('\n--- cleaning up ---');
                    return [4 /*yield*/, prisma_1.prisma.employee.delete({ where: { id: employee.id } })];
                case 14:
                    _c.sent();
                    console.log('Deleted employee');
                    return [4 /*yield*/, prisma_1.prisma.user.delete({ where: { id: user.id } })];
                case 15:
                    _c.sent();
                    console.log('Deleted user');
                    return [4 /*yield*/, prisma_1.prisma.rolePermission.deleteMany({ where: { roleId: role.id } })];
                case 16:
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.role.delete({ where: { id: role.id } })];
                case 17:
                    _c.sent();
                    console.log('Deleted role and permissions');
                    return [4 /*yield*/, prisma_1.prisma.branch.delete({ where: { id: branch.id } })];
                case 18:
                    _c.sent();
                    console.log('Deleted branch');
                    console.log('\n✅ CRUD Tests passed successfully!');
                    return [3 /*break*/, 20];
                case 19:
                    e_1 = _c.sent();
                    console.error('\n❌ Test failed: ', e_1);
                    return [3 /*break*/, 20];
                case 20: return [2 /*return*/];
            }
        });
    });
}
testDatabase().finally(function () { return prisma_1.prisma.$disconnect(); });
