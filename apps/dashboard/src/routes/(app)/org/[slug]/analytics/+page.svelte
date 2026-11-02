<script lang="ts">
  import { currentOrgPath } from '$lib/utils/store/org';
  import LearningAnalyticsPage from '$features/analytics/pages/learning-analytics.svelte';
</script>

<LearningAnalyticsPage employeesPath={`${$currentOrgPath}/employees`} coursesPath={`${$currentOrgPath}/courses`} />
