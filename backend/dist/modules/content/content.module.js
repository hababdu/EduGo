"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentModule = void 0;
const common_1 = require("@nestjs/common");
const courses_controller_1 = require("./courses/courses.controller");
const courses_service_1 = require("./courses/courses.service");
const subjects_controller_1 = require("./subjects/subjects.controller");
const subjects_service_1 = require("./subjects/subjects.service");
const sections_all_1 = require("./sections/sections.all");
const topics_all_1 = require("./topics/topics.all");
const lessons_all_1 = require("./lessons/lessons.all");
const admin_module_1 = require("../admin/admin.module");
const gamification_module_1 = require("../gamification/gamification.module");
let ContentModule = class ContentModule {
};
exports.ContentModule = ContentModule;
exports.ContentModule = ContentModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_module_1.AdminModule, gamification_module_1.GamificationModule],
        controllers: [
            courses_controller_1.CoursesController,
            subjects_controller_1.SubjectsController,
            sections_all_1.SectionsController,
            topics_all_1.TopicsController,
            lessons_all_1.LessonsController,
        ],
        providers: [
            courses_service_1.CoursesService,
            subjects_service_1.SubjectsService,
            sections_all_1.SectionsService,
            topics_all_1.TopicsService,
            lessons_all_1.LessonsService,
        ],
    })
], ContentModule);
//# sourceMappingURL=content.module.js.map