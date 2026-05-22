Implement a functional "Edit Profile" feature for the customers page.

### Changes:
- Create a reusable `ClienteDialog` component to handle both creation and editing of customers.
- Update `ClientesPage` to manage an `editingCliente` state.
- Implement `onEdit` and `onDelete` functions in `ClientesPage`.
- Wire up the "Editar perfil" dropdown menu item to trigger the edit dialog.
- Add a "Excluir" (Delete) option to the dropdown menu.
- Ensure the dialog title and buttons reflect the current action (Create vs. Edit).

### Technical Details:
- **Refactoring**: Extract `ClienteForm` into a more robust `ClienteDialog` that takes an optional `initialData` prop.
- **State Management**: Use a state variable `editingCliente` in `ClientesPage` to track which customer is being edited.
- **Visual Feedback**: Use `sonner` toasts for success and error messages.
- **Form Logic**: Update `onSave` logic to handle both inserting new records and updating existing ones based on the presence of an `id`.
