Project acronym | HPCS | HPCS | HPCS | HPCS
Project Title | Hybrid Parking Control System | Hybrid Parking Control System | Hybrid Parking Control System | Hybrid Parking Control System
Start Date | February 24th, 2026 | End Date |  | 
Lead Institution | International School, Duy Tan University | International School, Duy Tan University | International School, Duy Tan University | International School, Duy Tan University
Project Mentor | Trung,Tran Thanh | Trung,Tran Thanh | Trung,Tran Thanh | Trung,Tran Thanh
Scrum master / Project Leader & contact details | Khang, Nguyen Dinh Vinh Email: khanglucky@gmail.com Tel: 0704667333 | Khang, Nguyen Dinh Vinh Email: khanglucky@gmail.com Tel: 0704667333 | Khang, Nguyen Dinh Vinh Email: khanglucky@gmail.com Tel: 0704667333 | Khang, Nguyen Dinh Vinh Email: khanglucky@gmail.com Tel: 0704667333
Partner Organization | Duy Tan University | Duy Tan University | Duy Tan University | Duy Tan University
Project Web URL |  |  |  | 
Team members | Name | Email | Email | Tel
28211105939 | Ninh, Vu Ha | vuhaninh@dtu.edu.vn | vuhaninh@dtu.edu.vn | 0352637790
28219045377 | Hieu, Le Minh | xeniellq1@gmail.com | xeniellq1@gmail.com | 0777440100
28211141406 | Khang, Nguyen Dinh Vinh | khanglucky@gmail.com | khanglucky@gmail.com | 0704667333
28218044202 | Nhat, Le Van | nhatle08052004n@gmail.com | nhatle08052004n@gmail.com | 0394441571

Khang, Nguyen Dinh Vinh Student ID: 28211141406 Scrum Master | Signature | Date
Ninh, Vu Ha Student ID: 28211105939 Team Member | Signature | Date
Hieu, Le Minh Student ID: 28219045377 Team Member | Signature | Date
Nhat, Le Van Student ID: 28218044202 Team Member | Signature | Date

Document Title | Product Backlog Document | Product Backlog Document | Product Backlog Document
Author(s) | Vu Ha Ninh | Vu Ha Ninh | Vu Ha Ninh
Role | Team Member | Team Member | Team Member
Date | March 29th, 2026 | File name: | C1SE.08_Product BacklogHPCS_ver 1.1.docx

Version | Person(s) | Date | Description
1.0 | Vu Ha Ninh | 15-March-2026 | Create product backlog document
1.1 | Vu Ha Ninh | 29-March-2026 | Edit product backlog document
1.2 | Vu Ha Ninh |  | Release

1 | C1SE.08 Project Proposal Version 1.0, dated February 24th, 2026 | Primary source of truth for HPCS scope, requirements, stakeholders, schedule, and terminology.
2 | 2020-Scrum-Guide-US.pdf | Reference for Agile/Scrum framework, including product backlog management and prioritization.
3 | EasyOCR | Reference for license plate recognition and computer vision implementation.
4 | Docker Docs | Reference for system deployment and containerization.

ID | Theme | As a/an | I want to | So that | Priority
PB01 | User Registraion | User | Register with email & password | I can create an account and access the system | 1
PB02 | Secure Login (JWT) | User | Log in securely using email & password | I can access system functions based on my role | 1
PB03 | Profile Update | User | Update my profile (name, phone, avatar) | My personal information stays accurate | 1
PB04 | User Logout | User | Log out of the system | I can protect my account and prevent unauthorized access | 3
PB54 | Load Test Support | User | Have system load-testing capability | System performance is ensured under heavy usage | 1
PB55 | Responsive UI | User | Use a responsive interface | I can access the system comfortably on any device | 1

ID | Theme | As a/an | I want to | So that | Priority
PB05 | Admin System Dashboard | Admin | View a system dashboard | I can see user and exam statistics. | 1
PB06 | Role Assignment | Admin | Assign or change user roles | I can detect abnormal heat and ensure system safety | 1
PB39 | AI vs Instructor Score Logging | Admin | Log AI and instructor-adjusted scores | I grading adjustments are auditable. | 3
PB46 | Docker Deployment Support | Admin | Deploy the system via Docker | I it is portable and easy to run anywhere | 3
PB49 | Cheating/Violation Logs Access | Admin/ Instructor | Instructor view cheating and violation logs | I can audit suspicious activity. | 3
PB51 | Database Backup Restoration | Admin | Restore database backups | I system downtime is minimized. | 3
PB56 | Admin Dashboard Overview | Admin | View an overview of system results | I can monitor performance | 3

ID | Theme | As a/an | I want to | So that | Priority
PB07 | Admin Account Creation via Script/CLI | System | Create admin accounts via script/CLI | Secure access can be provisioned efficiently | 1
PB08 | Brute-Force Login Protection | System | Prevent brute-force login attempts | Accounts are safe from unauthorized access | 3
PB10 | Excel Sheet Pre-Import Validation | System | Check Excel sheets before import | Only valid sheets are parsed | 2
PB20 | Immediate MCQ Auto-Grading | System | Auto-grade MCQ answers on submit | Scores are immediate | 1
PB21 | Excel File Question Parsing | System | Parse Excel files | Questions are extracted and stored | 1
PB22 | Excel Question Validation | System | Detect dupliecate or | Imports are clean and valid | 1
PB23 | Automatic Question Classification | System | Classify questions | Instructors save time in organizing assessments | 3
PB24 | Anti-Cheat Monitoring & Enforcement | System | Perform anti-cheat monitoring | Violations are logged and enforced | 1
PB33 | Instant MCQ Exam Auto-Grading | System | Auto-grade MCQ exams | Results are instant | 1
PB34 | AI Essay Grading on Submission | System | Trigger AI essay grading on submission | Essay scores are recorded reliably | 1
PB47 | Secure Exam Sessions with JWT | System | Use JWT for exam sessions | Exam sessions are secure and authenticated | 3
PB48 | Suspicious Action Logging | System | Log suspicious actions | Cheating is detected and auditable | 3
PB50 | Automatic Database Backup | System | Perform automatic database backups | Data is safe and recoverable | 3
PB52 | Secure Input Validation | System | Validate inputs | SQL in jection and XSS attacks are prevented | 3
PB53 | Suspicious Activity Monitoring & Notification | System | Monitor suspicious activities | Student fraud notifications can be sent to faculty | 3

ID | Theme | As a/an | I want to | So that | Priority
PB11 | Create Exam Drafts | Instructor | Create exam drafts | I can save title, duration, and questions before publishing | 1
PB12 | Assign Exam Room Code | Instructor | Assign an exam to a room code | Students can join using that code | 3
PB13 | Edit/Delete Draft Exams | Instructor | Edit or delete draft exams | Only unpublished exams can be changed | 1
PB17 | Publish/Unpublish Exams | Instructor | Publish or unpublish exams | Only validated exams go live | 1
PB18 | View Student  Submissions & Details | Instructor | View submissions and per-student details | I can review answers and detect violations | 1
PB19 | Upload Excel Questions | Instructor | Upload Excel files | I can add questions to exams efficiently | 3
PB25 | Cheating Suspicion Logging | Instructor | Suspicious actions logged. | I cheating is detected and auditable | 1
PB36 | Set Exam Room Requirements | Instructor | Set room requirements (face/card/monitor) | Exam access follows policy | 1
PB37 | Review & Adjust AI Essay Scores | Instructor | Review AI essay scores | Grading is fair and accurate | 1
PB38 | Edit Final Grades | Instructor | Edit grades | Final results are accurate | 1
PB44 | View Student Results | Instructor | View results | I can track student performance | 1
PB45 | Export Student Results | Instructor | Export results | I can keep records and share data | 3
PB48 | Instructor-Verified  Results Validation | Instructor | Perform reliability checks | Perform  reliability checks | 1

ID | Theme | As a/an | I want to | So that | Priority
PB14 | Verify Exam Room Code | Student | Verify an exam room code | I only access exams that are valid and published | 1
PB15 | View MCQ and Essay Results | Student | View MCQ results immediately and essay results after instructor approval | Grading is fair and transparent | 1
PB16 | Join Exam Room & Create Submission | Student | Join an exam room using a code | My submission is created and my participation is recorded | 1
PB27 | Take MCQ Exams | Student | Take MCQ exams | I can answer multiple-choice questions | 1
PB28 | Take Essay Exams | Student | Take essay exams | I can write and submit written answers | 1
PB29 | Exam UI on PC and Mobile | Student | Use the exam interface on PC and mobile | I can take exams across different devices | 1
PB30 | Exam Countdown Timer | Student | Have a countdown timer | I know the remaining time during exams | 3
PB31 | Auto-Save Exam Answers | Student | Have my answers auto-saved as I respond | My progress is not lost during the exam | 1
PB32 | Submit Exam | Student | Submit my completed exam | My responses are recorded and finalized | 1
PB40 | View Immediate MCQ Results | Student | View MCQ results immediately | I know my MCQ score right after submission | 1
PB41 | AI verification | Student | Verify my face and student card | I am allowed to start the exam | 1
PB42 | Start/Resume Exam | Student | Start or resume my exam with a synced timer | Time limits are enforced  correctly | 1
PB43 | View Instructor-Confirmed Essay Results | Student | View essay results after instructor confirmation | Grading is validated and fair | 1

ID | Theme | As a/an | I want to | So that | Priority
PB09 | Setup Development Environment | Developer | Set up the development environment | The project is maintainable and development-ready | 3
PB57 | Provide API Documentation | Developer | Access API documentation | Integration with the system is easier and more reliable | 1

ID | Theme | As a/an | I want to | So that | Priority
PB26 | AI-Based Essay Scoring & Similarity | System / AI Integration | Send essay answers to AI | Similarity analysis and suggested scores are generated automatically | 1
PB35 | AI-Based Essay Scoring & Similarity | AI | Analyze essay content | Return similarity metrics and suggested scores | 1

Constraint | Condition
Time | Project completion time limit of 108 days so time to complete the project is restricted.
People constraint | 4 people working together to finish the project
Requirements | According to the Product owner’s Requirements

Name | Description | Role
Product Owner | The Person who gives the Requirement. | Duy Tan University
Scrum Master | This is the stakeholder who leading, manage the website development Team. | Do Xuan Truong
Requirement Analyzer | This is a stakeholder that works with the Analysts to correctly translate requests or needs into requirements to be used for design. | All Member
Software Architect | This is a stakeholder that is primary for leading the website development. | Do Xuan Truong
Coder | This is a stakeholder that programs the software. | All Member

