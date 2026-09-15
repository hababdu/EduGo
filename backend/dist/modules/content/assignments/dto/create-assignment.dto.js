"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAssignmentDto = exports.TestQuestionDto = exports.AssignmentCategory = exports.AssignmentType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var AssignmentType;
(function (AssignmentType) {
    AssignmentType["TEXT"] = "TEXT";
    AssignmentType["IMAGE"] = "IMAGE";
    AssignmentType["PDF"] = "PDF";
    AssignmentType["VIDEO"] = "VIDEO";
})(AssignmentType || (exports.AssignmentType = AssignmentType = {}));
var AssignmentCategory;
(function (AssignmentCategory) {
    AssignmentCategory["LESSON"] = "LESSON";
    AssignmentCategory["HOMEWORK"] = "HOMEWORK";
    AssignmentCategory["RESOURCE"] = "RESOURCE";
})(AssignmentCategory || (exports.AssignmentCategory = AssignmentCategory = {}));
class TestQuestionDto {
}
exports.TestQuestionDto = TestQuestionDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Savol matni noto\'g\'ri formatda' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Savol matni bo\'sh bo\'lishi mumkin emas' }),
    __metadata("design:type", String)
], TestQuestionDto.prototype, "question", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Variantlar massiv ko\'rinishida bo\'lishi kerak' }),
    (0, class_validator_1.IsString)({ each: true, message: 'Har bir variant matn bo\'lishi kerak' }),
    __metadata("design:type", Array)
], TestQuestionDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'To\'g\'ri javob indeksi raqam bo\'lishi kerak' }),
    __metadata("design:type", Number)
], TestQuestionDto.prototype, "correctOption", void 0);
class CreateAssignmentDto {
}
exports.CreateAssignmentDto = CreateAssignmentDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Sarlavha matn ko\'rinishida bo\'lishi kerak' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Sarlavha bo\'sh bo\'lishi mumkin emas' }),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Tafsilotlar matn ko\'rinishida bo\'lishi kerak' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(AssignmentType, { message: 'Noto\'g\'ri kontent formati tanlandi' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Kontent formati ko\'rsatilishi shart' }),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(AssignmentCategory, { message: 'Noto\'g\'ri material toifasi tanlandi' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Material toifasi ko\'rsatilishi shart' }),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Media URL matn ko\'rinishida bo\'lishi kerak' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "mediaUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Guruh ID si matn ko\'rinishida bo\'lishi kerak' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Guruh tanlanishi shart' }),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "groupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: 'Testlar ro\'yxati xato formatda' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TestQuestionDto),
    __metadata("design:type", Array)
], CreateAssignmentDto.prototype, "tests", void 0);
//# sourceMappingURL=create-assignment.dto.js.map