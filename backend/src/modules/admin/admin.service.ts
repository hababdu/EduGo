import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FilterStudentsDto,
  AdjustScoreDto,
  AssignGroupDto,
  CreateGroupDto,
  CreateSubjectDto,
  AssignTeacherSubjectDto,
  UpdateUserRoleDto,
} from './dto/admin-api.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Overview
  async getOverview() {
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalCourses,
      totalSubjects,
      totalTests,
      completedTests,
      todayAttempts,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' as any } }),
      this.prisma.user.count({ where: { role: 'TEACHER' } }),
      this.prisma.course.count(),
      this.prisma.subject.count(),
      this.prisma.test.count(),
      this.prisma.testSession.count({ where: { status: 'COMPLETED' as any } }),
      this.prisma.testSession.count({
        where: {
          startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      totals: {
        students: totalStudents,
        activeStudents,
        teachers: totalTeachers,
        courses: totalCourses,
        subjects: totalSubjects,
        tests: totalTests,
        completedTests,
        totalScoreIssued: 0,
      },
      today: { testAttempts: todayAttempts },
      charts: {
        dailyActiveUsers: [],
      },
    };
  }

  // 2. Students List
  async getStudents(dto: FilterStudentsDto) {
    const page = Number(dto.page) || 1;
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: any = { role: 'STUDENT' };

    if (dto.search) {
      where.OR = [
        { firstName: { contains: dto.search, mode: 'insensitive' } },
        { lastName: { contains: dto.search, mode: 'insensitive' } },
        { username: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.status === 'BLOCKED') where.status = 'BLOCKED';
    if (dto.status === 'ACTIVE') where.status = 'ACTIVE';

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { registeredAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      username: s.username,
      role: s.role as 'STUDENT' | 'TEACHER' | 'ADMIN',
      status: (String(s.status) === 'BLOCKED' || String(s.status) === 'SUSPENDED') ? ('BLOCKED' as const) : ('ACTIVE' as const),
      groupId: null,
      groupName: null,
      registeredAt: s.registeredAt ? s.registeredAt.toISOString() : new Date().toISOString(),
      lastActiveAt: s.lastActiveAt ? s.lastActiveAt.toISOString() : new Date().toISOString(),
      totalScore: 0,
      level: 1,
    }));

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 3. Student Detail
// 3. Student Detail
  async getStudentDetail(id: string) {
    const student = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    const testSessions = await this.prisma.testSession.findMany({
      where: {
        OR: [
          { studentId: id } as any,
          { userId: id } as any,
        ],
      },
      take: 10,
      orderBy: { startedAt: 'desc' },
    }).catch(() => []);

    return {
      ...student,
      testSessions,
    };
  }

  // 4. Block / Unblock
  async setStudentBlock(id: string, isBlocked: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { status: (isBlocked ? 'BLOCKED' : 'ACTIVE') as any },
    });
  }

  // 5. Adjust Score
  async adjustScore(id: string, dto: AdjustScoreDto) {
    return { id, adjustedAmount: dto.amount, reason: dto.reason };
  }

  // 6. Assign Student Group
  async assignStudentGroup(studentId: string, groupId: string | null) {
    return { studentId, groupId };
  }

  // 7. Teachers
  async getTeachers() {
    const teachers = await this.prisma.user.findMany({
      where: { role: 'TEACHER' },
    });

    return teachers.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      username: t.username,
      subjects: [],
      groupsCount: 0,
    }));
  }

  // 8. Assign Teacher Subject
  async assignTeacherSubject(teacherId: string, subjectId: string) {
    return { success: true, teacherId, subjectId };
  }

  // 9. Groups
  async getGroups() {
    const groups = await this.prisma.group.findMany();

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      teacherId: g.teacherId,
      teacherName: null,
      studentsCount: 0,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  async createGroup(dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        name: dto.name,
        teacherId: dto.teacherId || null,
      },
    });
  }

  // 10. Subjects
  async getSubjects() {
    const subjects = await this.prisma.subject.findMany();

    return subjects.map((s) => ({
      id: s.id,
      name: s.title,
      code: s.id.substring(0, 6).toUpperCase(),
      teachersCount: 0,
      topicsCount: 0,
    }));
  }

  async createSubject(dto: CreateSubjectDto) {
    const firstCourse = await this.prisma.course.findFirst();
    if (!firstCourse) {
      throw new NotFoundException('Biror kurs topilmadi. Avval kurs yarating.');
    }

    return this.prisma.subject.create({
      data: {
        title: dto.name,
        courseId: firstCourse.id,
      },
    });
  }

  // 11. Role Update
  async updateUserRole(userId: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });
  }
}