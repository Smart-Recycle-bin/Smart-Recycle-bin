import { Pipe, PipeTransform } from '@angular/core';
import { DateInput, formatDate } from '../utils/datetime';

@Pipe({
  name: 'dateOnly',
  pure: true,
  standalone: true,
})
export class DateOnlyPipe implements PipeTransform {
  transform(value: DateInput, timeZone?: string): string {
    return formatDate(value, timeZone);
  }
}
