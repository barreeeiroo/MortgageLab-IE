import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateOfBirthPicker } from "../DateOfBirthPicker";

describe("DateOfBirthPicker", () => {
    it("renders with label", () => {
        render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

        expect(screen.getByText("Date of Birth")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("DD/MM/YYYY")).toBeInTheDocument();
    });

    it("displays formatted date when value is provided", () => {
        const date = new Date(1990, 5, 15); // June 15, 1990
        render(<DateOfBirthPicker value={date} onChange={vi.fn()} />);

        expect(screen.getByDisplayValue("15/06/1990")).toBeInTheDocument();
    });

    it("has a calendar button", () => {
        render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

        expect(
            screen.getByRole("button", { name: "Open calendar" }),
        ).toBeInTheDocument();
    });

    it("uses custom id when provided", () => {
        render(
            <DateOfBirthPicker
                value={undefined}
                onChange={vi.fn()}
                id="custom-dob"
            />,
        );

        expect(screen.getByPlaceholderText("DD/MM/YYYY")).toHaveAttribute(
            "id",
            "custom-dob",
        );
    });

    it("uses custom label when provided", () => {
        render(
            <DateOfBirthPicker
                value={undefined}
                onChange={vi.fn()}
                label="Birth Date"
            />,
        );

        expect(screen.getByText("Birth Date")).toBeInTheDocument();
    });

    describe("text input", () => {
        it("auto-inserts slashes when typing", async () => {
            const user = userEvent.setup();
            render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

            const input = screen.getByPlaceholderText("DD/MM/YYYY");
            await user.type(input, "15");

            expect(input).toHaveValue("15/");
        });

        it("auto-inserts second slash after month", async () => {
            const user = userEvent.setup();
            render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

            const input = screen.getByPlaceholderText("DD/MM/YYYY");
            await user.type(input, "1506");

            expect(input).toHaveValue("15/06/");
        });

        it("calls onChange with valid date when complete", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(<DateOfBirthPicker value={undefined} onChange={onChange} />);

            const input = screen.getByPlaceholderText("DD/MM/YYYY");
            await user.type(input, "15061990");

            expect(onChange).toHaveBeenCalled();
            const calledDate = onChange.mock.calls[0][0] as Date;
            expect(calledDate.getDate()).toBe(15);
            expect(calledDate.getMonth()).toBe(5); // June (0-indexed)
            expect(calledDate.getFullYear()).toBe(1990);
        });

        it("calls onChange with undefined when input is cleared", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const date = new Date(1990, 5, 15);
            render(<DateOfBirthPicker value={date} onChange={onChange} />);

            const input = screen.getByDisplayValue("15/06/1990");
            await user.clear(input);

            expect(onChange).toHaveBeenCalledWith(undefined);
        });

        it("strips non-numeric and non-slash characters", async () => {
            const user = userEvent.setup();
            render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

            const input = screen.getByPlaceholderText("DD/MM/YYYY");
            await user.type(input, "15abc06def1990");

            expect(input).toHaveValue("15/06/1990");
        });

        it("limits input length to 10 characters", async () => {
            const user = userEvent.setup();
            render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

            const input = screen.getByPlaceholderText("DD/MM/YYYY");
            await user.type(input, "15061990123456");

            expect(input).toHaveValue("15/06/1990");
        });
    });

    describe("calendar popup", () => {
        it("opens calendar when button is clicked", async () => {
            const user = userEvent.setup();
            render(<DateOfBirthPicker value={undefined} onChange={vi.fn()} />);

            await user.click(
                screen.getByRole("button", { name: "Open calendar" }),
            );

            expect(screen.getByRole("grid")).toBeInTheDocument();
        });
    });
});
