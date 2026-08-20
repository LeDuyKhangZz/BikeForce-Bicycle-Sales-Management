select employee_name, qty_account_in_charge, qty_account_interactive,
       qty_account_sold, qty_account_sold_this_period
from public.amis_employee_metrics
order by employee_name;