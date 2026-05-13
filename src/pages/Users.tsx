import { motion } from "framer-motion";
import AdminUsersTable from "@/components/AdminUsersTable";

const Users = () => {
  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto lg:max-w-7xl lg:px-8 lg:pb-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-5 lg:mb-7"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="text-4xl font-display text-foreground lg:text-5xl">Users</h1>
      </motion.div>

      <AdminUsersTable />
    </div>
  );
};

export default Users;
