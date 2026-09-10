import { Component, EventEmitter, HostListener, Input, Output, ViewEncapsulation } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { User } from '../../core/models';

interface AssigneeGroup {
  name: string;
  members: User[];
}

@Component({
  selector: 'app-assignee-select',
  standalone: true,
  imports: [OverlayModule],
  templateUrl: './assignee-select.component.html',
  styleUrl: './assignee-select.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AssigneeSelectComponent {
  @Input() members: User[] = [];
  @Input() selectedIds: number[] = [];
  @Output() selectedIdsChange = new EventEmitter<number[]>();

  open = false;

  get groups(): AssigneeGroup[] {
    const grouped = new Map<string, User[]>();
    for (const member of this.members) {
      const name = member.department_name?.trim() || 'Sem departamento';
      const list = grouped.get(name) ?? [];
      list.push(member);
      grouped.set(name, list);
    }

    const named = [...grouped.entries()]
      .filter(([name]) => name !== 'Sem departamento')
      .sort((a, b) => a[0].localeCompare(b[0], 'pt'));
    const unnamed = grouped.get('Sem departamento');

    return [
      ...named.map(([name, members]) => ({ name, members })),
      ...(unnamed?.length ? [{ name: 'Sem departamento', members: unnamed }] : []),
    ];
  }

  get triggerLabel(): string {
    if (!this.selectedIds.length) return 'Selecionar utilizadores';
    const names = this.members
      .filter((member) => this.selectedIds.includes(member.id))
      .map((member) => member.username);
    if (!names.length) return `${this.selectedIds.length} selecionados`;
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }

  toggleOpen(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggleMember(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = checked
      ? [...this.selectedIds, id]
      : this.selectedIds.filter((value) => value !== id);
    this.selectedIdsChange.emit(next);
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.open = false;
  }
}
