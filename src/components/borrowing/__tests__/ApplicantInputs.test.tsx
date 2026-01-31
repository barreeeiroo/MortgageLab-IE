import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicantInputs } from "../ApplicantInputs";

describe("ApplicantInputs", () => {
    const defaultProps = {
        applicationType: "sole" as const,
        onApplicationTypeChange: vi.fn(),
        income1: "",
        onIncome1Change: vi.fn(),
        income2: "",
        onIncome2Change: vi.fn(),
        birthDate1: undefined,
        onBirthDate1Change: vi.fn(),
        birthDate2: undefined,
        onBirthDate2Change: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("application type selection", () => {
        it("renders sole and joint applicant buttons", () => {
            render(<ApplicantInputs {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /sole applicant/i }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /joint applicants/i }),
            ).toBeInTheDocument();
        });

        it("highlights sole applicant button when sole is selected", () => {
            render(
                <ApplicantInputs {...defaultProps} applicationType="sole" />,
            );

            const soleButton = screen.getByRole("button", {
                name: /sole applicant/i,
            });
            const jointButton = screen.getByRole("button", {
                name: /joint applicants/i,
            });

            // Default variant has different styling than outline
            expect(soleButton).not.toHaveClass("border");
            expect(jointButton).toHaveClass("border");
        });

        it("calls onApplicationTypeChange when joint is clicked", async () => {
            const user = userEvent.setup();
            const onApplicationTypeChange = vi.fn();
            render(
                <ApplicantInputs
                    {...defaultProps}
                    onApplicationTypeChange={onApplicationTypeChange}
                />,
            );

            await user.click(
                screen.getByRole("button", { name: /joint applicants/i }),
            );

            expect(onApplicationTypeChange).toHaveBeenCalledWith("joint");
        });

        it("calls onApplicationTypeChange when sole is clicked", async () => {
            const user = userEvent.setup();
            const onApplicationTypeChange = vi.fn();
            render(
                <ApplicantInputs
                    {...defaultProps}
                    applicationType="joint"
                    onApplicationTypeChange={onApplicationTypeChange}
                />,
            );

            await user.click(
                screen.getByRole("button", { name: /sole applicant/i }),
            );

            expect(onApplicationTypeChange).toHaveBeenCalledWith("sole");
        });
    });

    describe("sole applicant mode", () => {
        it("shows single income input with generic label", () => {
            render(
                <ApplicantInputs {...defaultProps} applicationType="sole" />,
            );

            expect(
                screen.getByLabelText(/gross annual salary/i),
            ).toBeInTheDocument();
            expect(
                screen.queryByLabelText(/second applicant/i),
            ).not.toBeInTheDocument();
        });

        it("shows single date of birth picker with generic label", () => {
            render(
                <ApplicantInputs {...defaultProps} applicationType="sole" />,
            );

            expect(
                screen.getByLabelText(/date of birth$/i),
            ).toBeInTheDocument();
        });

        it("does not show second applicant inputs", () => {
            render(
                <ApplicantInputs {...defaultProps} applicationType="sole" />,
            );

            expect(
                screen.queryByLabelText(
                    /second applicant's gross annual salary/i,
                ),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByLabelText(/second applicant's date of birth/i),
            ).not.toBeInTheDocument();
        });
    });

    describe("joint applicant mode", () => {
        it("shows both income inputs with specific labels", () => {
            render(
                <ApplicantInputs {...defaultProps} applicationType="joint" />,
            );

            expect(
                screen.getByLabelText(/your gross annual salary/i),
            ).toBeInTheDocument();
            expect(
                screen.getByLabelText(
                    /second applicant's gross annual salary/i,
                ),
            ).toBeInTheDocument();
        });

        it("shows both date of birth pickers", () => {
            render(
                <ApplicantInputs {...defaultProps} applicationType="joint" />,
            );

            expect(
                screen.getByLabelText(/your date of birth/i),
            ).toBeInTheDocument();
            expect(
                screen.getByLabelText(/second applicant's date of birth/i),
            ).toBeInTheDocument();
        });
    });

    describe("income input handling", () => {
        it("calls onIncome1Change with numeric value only", async () => {
            const user = userEvent.setup();
            const onIncome1Change = vi.fn();
            render(
                <ApplicantInputs
                    {...defaultProps}
                    onIncome1Change={onIncome1Change}
                />,
            );

            const input = screen.getByLabelText(/gross annual salary/i);
            await user.type(input, "50000");

            // Should be called for each character typed
            expect(onIncome1Change).toHaveBeenCalled();
        });

        it("displays formatted income value", () => {
            render(<ApplicantInputs {...defaultProps} income1="50000" />);

            const input = screen.getByLabelText(/gross annual salary/i);
            expect(input).toHaveValue("€50,000");
        });

        it("calls onIncome2Change in joint mode", async () => {
            const user = userEvent.setup();
            const onIncome2Change = vi.fn();
            render(
                <ApplicantInputs
                    {...defaultProps}
                    applicationType="joint"
                    onIncome2Change={onIncome2Change}
                />,
            );

            const input = screen.getByLabelText(
                /second applicant's gross annual salary/i,
            );
            await user.type(input, "45000");

            expect(onIncome2Change).toHaveBeenCalled();
        });
    });

    describe("age display", () => {
        it("shows age when birth date is set", () => {
            // Set birth date to 30 years ago
            const birthDate = new Date();
            birthDate.setFullYear(birthDate.getFullYear() - 30);

            render(
                <ApplicantInputs {...defaultProps} birthDate1={birthDate} />,
            );

            expect(screen.getByText("30 years old")).toBeInTheDocument();
        });

        it("shows warning for age over 63 (max applicant age)", () => {
            // Set birth date to 64 years ago - exceeds MAX_APPLICANT_AGE of 63
            const birthDate = new Date();
            birthDate.setFullYear(birthDate.getFullYear() - 64);

            render(
                <ApplicantInputs {...defaultProps} birthDate1={birthDate} />,
            );

            const ageText = screen.getByText("64 years old");
            expect(ageText).toHaveClass("text-destructive");
        });

        it("does not show warning for age 63 or under", () => {
            // Set birth date to 63 years ago - at the MAX_APPLICANT_AGE limit
            const birthDate = new Date();
            birthDate.setFullYear(birthDate.getFullYear() - 63);

            render(
                <ApplicantInputs {...defaultProps} birthDate1={birthDate} />,
            );

            const ageText = screen.getByText("63 years old");
            expect(ageText).not.toHaveClass("text-destructive");
            expect(ageText).toHaveClass("text-muted-foreground");
        });

        it("shows ages for both applicants in joint mode", () => {
            const birthDate1 = new Date();
            birthDate1.setFullYear(birthDate1.getFullYear() - 35);

            const birthDate2 = new Date();
            birthDate2.setFullYear(birthDate2.getFullYear() - 32);

            render(
                <ApplicantInputs
                    {...defaultProps}
                    applicationType="joint"
                    birthDate1={birthDate1}
                    birthDate2={birthDate2}
                />,
            );

            expect(screen.getByText("35 years old")).toBeInTheDocument();
            expect(screen.getByText("32 years old")).toBeInTheDocument();
        });
    });

    describe("income note", () => {
        it("renders income note when provided", () => {
            render(
                <ApplicantInputs
                    {...defaultProps}
                    incomeNote={
                        <span data-testid="income-note">
                            Custom income note
                        </span>
                    }
                />,
            );

            expect(screen.getByTestId("income-note")).toBeInTheDocument();
            expect(screen.getByText("Custom income note")).toBeInTheDocument();
        });

        it("does not render income note area when not provided", () => {
            render(<ApplicantInputs {...defaultProps} />);

            expect(
                screen.queryByText("Custom income note"),
            ).not.toBeInTheDocument();
        });
    });
});
