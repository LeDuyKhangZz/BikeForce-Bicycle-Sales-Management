type SelectionControl = {
  isChecked(): Promise<boolean>;
  select(): Promise<void>;
};

export async function ensureSelected(control: SelectionControl): Promise<void> {
  if (!(await control.isChecked())) await control.select();
}
